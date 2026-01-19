const generateRecommendation = async (req, res) => {
    try {
        const { answers } = req.body;

        if (!process.env.OPENROUTER_API_KEY) {
            console.error("OPENROUTER_API_KEY missing in backend .env");
            return res.status(500).json({ error: "Backend missing OPENROUTER_API_KEY" });
        }

        const prompt = `
You are an expert Pet Matchmaker AI.

Analyze the user profile below and recommend ONE suitable type of pet.
The recommendation must be creative and varied. Consider unique pets (e.g., Hedgehog, Ferret, Guinea Pig, Chinchilla, Reptile, Parrot) as well as common ones. Avoid defaulting to Cats/Dogs unless they are the perfect match.

User Profile:
- Living Space: ${answers[1]}
- Daily Free Time: ${answers[2]}
- Pet Experience: ${answers[3]}
- Preference: ${answers[4]}

Rules:
- Recommend only ONE pet type.
- Be creative! If the profile allows, suggest something interesting.
- Keep the response between 3 and 5 short lines.
- Explain WHY clearly and practically based on the user profile.
- Do NOT include thinking steps, analysis, or extra commentary.
- Text only, no format
        `;

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "http://localhost:5000",
                "X-Title": "PAWS App",
            },
            body: JSON.stringify({
                "model": "xiaomi/mimo-v2-flash:free",
                "messages": [
                    { "role": "user", "content": prompt }
                ]
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("OpenRouter Error:", errorText);
            throw new Error(`OpenRouter API Error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        let text = data.choices[0]?.message?.content || "";

        // Clean up DeepSeek's <think> tags if they appear (harmless for others)
        text = text.replace(/<think>[\s\S]*?<\/think>/g, "").trim();

        res.json({ recommendation: text });

    } catch (error) {
        console.error("AI Controller Error:", error);
        res.status(500).json({ error: "Failed to generate recommendation" });
    }
};

module.exports = { generateRecommendation };
