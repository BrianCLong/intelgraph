# This Rego policy denies deployments using mutable tags or unsigned images.
package k8srequiredsignatures

deny[msg] {
  input.review.object.kind == "Deployment"
  some c
  img := input.review.object.spec.template.spec.containers[c].image
  endswith(img, ":latest")
  msg := sprintf("mutable tag forbidden: %v", [img])
}

deny[msg] {
  input.review.object.kind == "Deployment"
  some c
  img := input.review.object.spec.template.spec.containers[c].image
  not verified(img)
  msg := sprintf("image not signed with allowed identity: %v", [img])
}

verified(img) {
  allowed := {"repo": "github.com/org/repo", "ref": input.review.object.metadata.annotations["git.sha"]}
  sig := data.image.signatures[img]
  sig.sub == "repo:github.com/org/repo"
  sig.digest == data.image.digests[img]
  sig.commit == allowed.ref
}
