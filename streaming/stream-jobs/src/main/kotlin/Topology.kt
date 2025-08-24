package streaming

import org.apache.kafka.common.serialization.Serdes
import org.apache.kafka.streams.StreamsBuilder
import org.apache.kafka.streams.Topology
import org.apache.kafka.streams.kstream.*

data class Event(val entityId: String, val value: Double)
data class Feature(val entityId: String, val deg: Double)
data class Enriched(val entityId: String, val value: Double, val deg: Double)
data class Score(val entityId: String, val score: Double, val threshold: Double = 0.5)

fun topology(builder: StreamsBuilder): Topology {
  val raw: KStream<String, Event> = builder.stream("ingest.raw.v1", Consumed.with(Serdes.String(), eventSerde()))
  val features: KTable<String, Feature> = builder.table("features.entity.v1", Consumed.with(Serdes.String(), featureSerde()))

  val enriched: KStream<String, Enriched> = raw.leftJoin(features,
    { e -> e.entityId },
    { e, f -> Enriched(e.entityId, e.value, f?.deg ?: 0.0) },
    Joined.with(Serdes.String(), eventSerde(), featureSerde())
  )

  val signals = enriched.mapValues { v -> Score(v.entityId, v.value + v.deg) }
  signals.to("signals.scores.v1", Produced.with(Serdes.String(), scoreSerde()))

  val alerts = signals.filter { _, s -> s.score > s.threshold }
  alerts.mapValues { s -> "{""entityId"":""${s.entityId}"",""score"":${s.score}}" }
    .to("alerts.v1", Produced.with(Serdes.String(), Serdes.String()))

  return builder.build()
}

fun eventSerde(): Serde<Event> = TODO()
fun featureSerde(): Serde<Feature> = TODO()
fun scoreSerde(): Serde<Score> = TODO()
