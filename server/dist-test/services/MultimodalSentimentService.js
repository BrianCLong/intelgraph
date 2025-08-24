const Sentiment = require("sentiment");
class MultimodalSentimentService {
    constructor() {
        this.sentiment = new Sentiment();
    }
    analyzeText(text) {
        if (!text)
            return { score: 0, comparative: 0 };
        const res = this.sentiment.analyze(text);
        return { score: res.score, comparative: res.comparative };
    }
    analyzeImage({ caption }) {
        // For now, treat image analysis as sentiment of caption if provided
        return this.analyzeText(caption || "");
    }
    analyzeAudio({ transcript }) {
        // For now, treat audio analysis as sentiment of transcript if provided
        return this.analyzeText(transcript || "");
    }
    analyzeVideo({ transcript, caption }) {
        // Combine transcript and caption
        return this.analyzeText([caption, transcript].filter(Boolean).join(" "));
    }
    analyzeInputs(inputs) {
        const results = [];
        inputs.forEach((inp, idx) => {
            const kind = String(inp.kind || "text").toLowerCase();
            let r = { score: 0, comparative: 0 };
            if (kind === "text")
                r = this.analyzeText(inp.text || "");
            else if (kind === "image")
                r = this.analyzeImage(inp);
            else if (kind === "audio")
                r = this.analyzeAudio(inp);
            else if (kind === "video")
                r = this.analyzeVideo(inp);
            results.push({
                id: inp.id || String(idx + 1),
                kind,
                score: r.score,
                comparative: r.comparative,
                textPreview: (inp.text || inp.caption || inp.transcript || "").slice(0, 120),
            });
        });
        const agg = results.reduce((a, b) => a + (b.comparative || 0), 0) /
            (results.length || 1);
        return { items: results, aggregateScore: agg };
    }
}
module.exports = MultimodalSentimentService;
//# sourceMappingURL=MultimodalSentimentService.js.map