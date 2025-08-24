from finintel import typologies


def test_structuring_and_circular():
    txs = [
        typologies.Transaction(id='t1', from_account='a1', to_account='hub', amount=300, ts=0),
        typologies.Transaction(id='t2', from_account='a2', to_account='hub', amount=300, ts=10),
        typologies.Transaction(id='t3', from_account='a3', to_account='hub', amount=400, ts=20),
        typologies.Transaction(id='t4', from_account='hub', to_account='a1', amount=1000, ts=30),
        typologies.Transaction(id='t5', from_account='a1', to_account='a2', amount=50, ts=40),
        typologies.Transaction(id='t6', from_account='a2', to_account='a3', amount=50, ts=50),
        typologies.Transaction(id='t7', from_account='a3', to_account='a1', amount=50, ts=60)
    ]
    struct_alerts = typologies.detect_structuring(txs, 900, 100, 3)
    assert struct_alerts, 'structuring alert missing'
    circ_alerts = typologies.detect_circular(txs, 4)
    assert circ_alerts, 'circular alert missing'
