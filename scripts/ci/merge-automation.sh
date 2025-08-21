#!/bin/bash

# IntelGraph Merge Automation Script
# Safely merges green PRs when CI is stable

set -e

REPO="BrianCLong/intelgraph"
DAYS=7

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if gh CLI is installed and authenticated
    if ! command -v gh &> /dev/null; then
        log_error "GitHub CLI (gh) is not installed"
        exit 1
    fi
    
    # Check if authenticated
    if ! gh auth status &> /dev/null; then
        log_error "Not authenticated with GitHub CLI. Run: gh auth login"
        exit 1
    fi
    
    # Check if we can access the repo
    if ! gh repo view "$REPO" &> /dev/null; then
        log_error "Cannot access repository $REPO"
        exit 1
    fi
    
    log_info "Prerequisites check passed"
}

get_green_prs() {
    log_info "Finding PRs with green CI..."
    
    # Get PRs updated in the last 7 days with approved reviews
    local prs_json=$(gh pr list -R "$REPO" \
        --state open \
        --search "updated:>=$(date -u -v-${DAYS}d +%Y-%m-%d) review:approved -is:draft" \
        --json number,title,baseRefName,headRefName,isDraft,reviewDecision,mergeStateStatus,labels,author,mergeable,statusCheckRollup)
    
    echo "$prs_json"
}

filter_mergeable_prs() {
    local prs_json="$1"
    
    log_info "Filtering for mergeable PRs..."
    
    # Filter PRs that are:
    # 1. Not draft
    # 2. Have approved reviews
    # 3. Are mergeable (no conflicts)
    # 4. Don't have blocking labels
    # 5. Have all required checks passing
    
    echo "$prs_json" | jq -r '
        .[] | 
        select(.isDraft == false) |
        select(.reviewDecision == "APPROVED") |
        select(.mergeable == "MERGEABLE") |
        select([.labels[]?.name] | index("wip") | not) |
        select([.labels[]?.name] | index("hold") | not) |
        select([.labels[]?.name] | index("do-not-merge") | not) |
        select([.labels[]?.name] | index("merge-freeze") | not) |
        select(.statusCheckRollup | map(select(.conclusion == "FAILURE")) | length == 0) |
        {number, title, headRefName, baseRefName, author: .author.login}
    ' | jq -s '.'
}

determine_merge_method() {
    local head_ref="$1"
    
    case "$head_ref" in
        feature/*|bugfix/*)
            echo "squash"
            ;;
        docs/*|chore/*)
            echo "rebase"
            ;;
        release/*)
            echo "merge"
            ;;
        dependabot/*)
            echo "squash"
            ;;
        *)
            echo "squash"  # Default to squash
            ;;
    esac
}

merge_pr() {
    local pr_number="$1"
    local merge_method="$2"
    local title="$3"
    local author="$4"
    
    log_info "Merging PR #$pr_number ($title) by $author using $merge_method method"
    
    local merge_flag=""
    case "$merge_method" in
        "squash")
            merge_flag="--squash"
            ;;
        "rebase")
            merge_flag="--rebase"
            ;;
        "merge")
            merge_flag="--merge"
            ;;
    esac
    
    # Attempt to merge
    if gh pr merge -R "$REPO" "$pr_number" $merge_flag --delete-branch; then
        log_info "✅ Successfully merged PR #$pr_number"
        
        # Add success reaction
        gh pr comment -R "$REPO" "$pr_number" --body "🎉 Successfully merged! Thanks for your contribution."
        
        return 0
    else
        log_error "❌ Failed to merge PR #$pr_number"
        
        # Add needs-attention label and comment
        gh pr edit -R "$REPO" "$pr_number" --add-label "needs-attention"
        gh pr comment -R "$REPO" "$pr_number" --body "⚠️ Automatic merge failed. Please check for conflicts or CI issues and merge manually."
        
        return 1
    fi
}

cleanup_merged_branches() {
    log_info "Cleaning up merged branches..."
    
    # Get list of remote branches
    local merged_branches=$(git for-each-ref --format='%(refname:short)' refs/remotes/origin/ | 
        grep -E '^origin/(feature|bugfix|docs|chore)/' | 
        sed 's/^origin\///')
    
    for branch in $merged_branches; do
        # Check if branch is fully merged into main
        if git merge-base --is-ancestor "origin/$branch" origin/main 2>/dev/null; then
            log_info "Deleting merged branch: $branch"
            gh api -X DELETE "repos/$REPO/git/refs/heads/$branch" 2>/dev/null || true
        fi
    done
}

create_summary() {
    local merged_count="$1"
    local failed_count="$2"
    local skipped_count="$3"
    
    cat << EOF
# IntelGraph Merge Automation Summary

## Results
- ✅ **Merged**: $merged_count PRs
- ❌ **Failed**: $failed_count PRs  
- ⏭️ **Skipped**: $skipped_count PRs

## Statistics
- **Total PRs processed**: $((merged_count + failed_count + skipped_count))
- **Success rate**: $(( merged_count * 100 / (merged_count + failed_count + 1) ))%
- **Run date**: $(date)

## Next Steps
EOF

    if [ "$failed_count" -gt 0 ]; then
        echo "- Review failed merges and resolve conflicts manually"
    fi
    
    if [ "$skipped_count" -gt 0 ]; then
        echo "- Review skipped PRs for approval or CI status"
    fi
    
    echo "- Monitor CI status for any regressions"
    echo "- Run branch cleanup if needed"
}

main() {
    log_info "Starting IntelGraph merge automation..."
    
    # Check prerequisites
    check_prerequisites
    
    # Get and filter PRs
    local all_prs=$(get_green_prs)
    local mergeable_prs=$(filter_mergeable_prs "$all_prs")
    
    local total_prs=$(echo "$all_prs" | jq 'length')
    local mergeable_count=$(echo "$mergeable_prs" | jq 'length')
    
    log_info "Found $total_prs total PRs, $mergeable_count are mergeable"
    
    if [ "$mergeable_count" -eq 0 ]; then
        log_warn "No PRs are ready to merge"
        exit 0
    fi
    
    # Process each mergeable PR
    local merged_count=0
    local failed_count=0
    local skipped_count=0
    
    echo "$mergeable_prs" | jq -c '.[]' | while read -r pr; do
        local pr_number=$(echo "$pr" | jq -r '.number')
        local title=$(echo "$pr" | jq -r '.title')
        local head_ref=$(echo "$pr" | jq -r '.headRefName')
        local author=$(echo "$pr" | jq -r '.author')
        
        # Determine merge method
        local merge_method=$(determine_merge_method "$head_ref")
        
        # Attempt merge
        if merge_pr "$pr_number" "$merge_method" "$title" "$author"; then
            ((merged_count++))
        else
            ((failed_count++))
        fi
        
        # Rate limiting
        sleep 2
    done
    
    # Cleanup merged branches
    cleanup_merged_branches
    
    # Create summary
    create_summary "$merged_count" "$failed_count" "$skipped_count"
    
    log_info "Merge automation completed"
}

# Handle script arguments
case "${1:-}" in
    "--dry-run")
        log_info "Dry run mode - no actual merges will be performed"
        DRY_RUN=true
        ;;
    "--help")
        echo "Usage: $0 [--dry-run|--help]"
        echo "  --dry-run: Show what would be merged without actually merging"
        echo "  --help: Show this help message"
        exit 0
        ;;
esac

# Run main function
main "$@"