from unittest import mock

import pytest

from packages.indexer.src.indexer import index_records


class DummyResp:
  def __init__(self, data):
    self._data = data

  async def __aenter__(self):
    return self

  async def __aexit__(self, *args):
    pass

  async def json(self):
    return self._data


def fake_post(self, url, json):
  return DummyResp({"count": len(json["records"])})


@pytest.mark.asyncio
async def test_index_records():
  with mock.patch("aiohttp.ClientSession.post", new=fake_post):
    count = await index_records([{"id": "1", "text": "Alpha"}])
    assert count == 1
