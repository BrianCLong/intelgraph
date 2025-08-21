from services.copilot.provider_mock.offline_model_runner import OfflineModelRunner


def test_offline_model_runner_deterministic():
    runner = OfflineModelRunner()
    result1 = runner.run("prompt")
    result2 = runner.run("prompt")
    assert result1 == result2
