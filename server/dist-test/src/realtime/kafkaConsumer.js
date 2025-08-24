"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stopKafkaConsumer = exports.startKafkaConsumer = void 0;
const kafkajs_1 = require("kafkajs"); // Assuming kafkajs is installed
const WargameResolver_1 = require("../resolvers/WargameResolver"); // Import the resolver
const KAFKA_BROKERS = process.env.KAFKA_BROKERS ? process.env.KAFKA_BROKERS.split(',') : ['localhost:9092'];
const KAFKA_TOPIC = 'intelgraph.alerts.crisis_scenario_trigger';
const KAFKA_GROUP_ID = 'wargame-dashboard-consumer-group';
let consumer = null;
const wargameResolver = new WargameResolver_1.WargameResolver(); // Instantiate the resolver
const startKafkaConsumer = async () => {
    if (process.env.NODE_ENV === 'production' && !KAFKA_BROKERS[0]) {
        console.warn('Kafka brokers not configured. Skipping Kafka consumer startup.');
        return;
    }
    const kafka = new kafkajs_1.Kafka({
        clientId: 'wargame-dashboard',
        brokers: KAFKA_BROKERS,
    });
    consumer = kafka.consumer({ groupId: KAFKA_GROUP_ID });
    try {
        await consumer.connect();
        await consumer.subscribe({ topic: KAFKA_TOPIC, fromBeginning: false });
        await consumer.run({
            eachMessage: async ({ topic, partition, message }) => {
                if (!message.value) {
                    console.warn(`Kafka Consumer: Received empty message from topic ${topic}`);
                    return;
                }
                const payload = JSON.parse(message.value.toString());
                console.log(`Kafka Consumer: Received message from topic ${topic}:`, payload);
                // WAR-GAMED SIMULATION - Process the message payload to trigger a simulation
                // Expected payload structure: { crisis_type, target_audiences, key_narratives, adversary_profiles, simulation_parameters }
                const scenarioInput = {
                    crisisType: payload.crisis_type || 'unknown_crisis',
                    targetAudiences: payload.target_audiences || ['general_public'],
                    keyNarratives: payload.key_narratives || ['unspecified_narrative'],
                    adversaryProfiles: payload.adversary_profiles || ['unknown_adversary'],
                    simulationParameters: payload.simulation_parameters || {},
                };
                console.log('Kafka Consumer: Triggering war-game simulation from Kafka message...');
                try {
                    // Call the resolver directly to run the simulation
                    const newScenario = await wargameResolver.runWarGameSimulation(null, // parent
                    { input: scenarioInput }, {} // context - mock as it's an internal call
                    );
                    console.log(`Kafka Consumer: Successfully triggered simulation for scenario: ${newScenario.id}`);
                }
                catch (error) {
                    console.error('Kafka Consumer: Error triggering simulation:', error);
                }
            },
        });
        console.log(`Kafka Consumer: Started listening on topic ${KAFKA_TOPIC}`);
    }
    catch (error) {
        console.error('Kafka Consumer: Failed to start:', error);
        if (consumer) {
            await consumer.disconnect();
        }
        consumer = null;
    }
};
exports.startKafkaConsumer = startKafkaConsumer;
const stopKafkaConsumer = async () => {
    if (consumer) {
        console.log('Kafka Consumer: Disconnecting...');
        await consumer.disconnect();
        consumer = null;
        console.log('Kafka Consumer: Disconnected.');
    }
};
exports.stopKafkaConsumer = stopKafkaConsumer;
//# sourceMappingURL=kafkaConsumer.js.map