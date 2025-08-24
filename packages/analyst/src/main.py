from fastapi import FastAPI
from pydantic import BaseModel
from .ach import run_ach
from .bayes import update
from .forecasts import brier_score, aggregate_mean

app = FastAPI()

class ACHRequest(BaseModel):
    hypotheses: list
    evidence: list

class BayesRequest(BaseModel):
    prior: float
    likelihood_true: float
    likelihood_false: float

@app.post('/ach/run')
def ach_run(req: ACHRequest):
    return run_ach(req.hypotheses, req.evidence)

@app.post('/bayes/update')
def bayes_update(req: BayesRequest):
    return {"posterior": update(req.prior, req.likelihood_true, req.likelihood_false)}

class ScoreRequest(BaseModel):
    prob: float
    outcome: bool

@app.post('/forecast/score')
def forecast_score(req: ScoreRequest):
    return {"brier": brier_score(req.prob, req.outcome)}

class AggregateRequest(BaseModel):
    judgments: list

@app.post('/forecast/aggregate')
def forecast_aggregate(req: AggregateRequest):
    return {"mean": aggregate_mean(req.judgments)}

@app.get('/health')
def health():
    return {"status": "ok"}
