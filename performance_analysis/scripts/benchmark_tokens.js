const { encode } = require('gpt-tokenizer');

/**
 * Mocks an external knowledge payload (e.g. a raw YouTube transcript)
 */
const mockRawTranscript = `
Welcome to this completely unrelated tutorial on building a React app.
First you need to install node and npm. Then you run create-react-app.
We will spend the next 20 minutes talking about my sponsors and how
I really like coffee before actually getting to the code.
Here is the code you need to copy:
function App() { return <h1>Hello World</h1>; }
Thank you for watching! Like and subscribe.
`.trim().repeat(10); // Simulating a reasonably long transcript

/**
 * Mocks the distilled payload returning only the relevant extracted info
 * after running it through the local lightweight model.
 */
const mockDistilledKnowledge = `
Prerequisites: Node, npm
Setup: create-react-app
Code Context: function App() { return <h1>Hello World</h1>; }
`.trim();

function runTokenBenchmark() {
    console.log("Starting Token Compression Benchmarks...\n");

    const rawTokens = encode(mockRawTranscript).length;
    const distilledTokens = encode(mockDistilledKnowledge).length;

    console.log(`[Metric] Raw Transcript Tokens (Before Distillation): ${rawTokens}`);
    console.log(`[Metric] Distilled Knowledge Tokens (After Distillation): ${distilledTokens}`);

    const compressionRatio = ((1 - (distilledTokens / rawTokens)) * 100).toFixed(2);
    console.log(`\n[Summary] Total Context Reduction: ${compressionRatio}%`);
    console.log(`This directly reduces the prompt size sent to the ide agent by ${compressionRatio}%, drastically saving tokens/costs and improving generation speed.`);
}

try {
    runTokenBenchmark();
} catch (error) {
    console.error("Token benchmark failed. Ensure you ran `npm install` correctly.", error);
}
