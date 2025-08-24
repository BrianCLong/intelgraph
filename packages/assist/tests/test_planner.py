import sys, os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'src'))
from planner import make_plan

def test_make_plan_risk():
  plan = make_plan('show risk metrics')
  assert plan
  assert plan.steps[0].tool == 'gql.run'
