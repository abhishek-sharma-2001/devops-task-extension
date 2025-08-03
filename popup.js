document.getElementById("generateBtn").onclick = async () => {
    const userInput = document.getElementById("userInput").value;

    const response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-goog-api-key": CONFIG.API_KEY
            },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [
                            {
                                text: `You're an assistant that creates Azure DevOps tasks.

Return only the following:
1. A task title on the first line (no label, just the title)
2. A list of task steps using Markdown bullet format ("- " at the start of each line)
3. No headings like "Task Title:" or "Task Steps:", just raw text.

Here is the task request: ${userInput}`
                            }
                        ]
                    }
                ]
            })
        }
    );

    const data = await response.json();
    console.log("Gemini API raw response:", data); // ✅ Full API response
    const output = data.candidates?.[0]?.content?.parts?.[0]?.text || "No response";
    console.log("Gemini output text:", output); // ✅ Generated task

    // Split title and description
    const [title, ...descLines] = output.split('\n');

    // Clean and sanitize description lines
    const filteredLines = descLines.filter(line =>
        !/^(\*\*?)?(task title|task steps|description|steps)[:：]/i.test(line.trim())
    );

    const cleanedLines = filteredLines.map(line => {
        const trimmed = line.trim();
        if (/^[-•*]\s/.test(trimmed)) return trimmed; // already bulleted
        if (/^Step\s*\d+[:.)]/i.test(trimmed)) return `- ${trimmed.replace(/^Step\s*\d+[:.)]?\s*/i, '')}`;
        return `- ${trimmed}`;
    });

    document.getElementById("taskTitle").value = title.trim();
    document.getElementById("taskDesc").value = cleanedLines.join('\n').trim();
    document.getElementById("taskPreview").style.display = "block";
};


document.getElementById("createBtn").onclick = async () => {
    const title = document.getElementById("taskTitle").value;
    const description = document.getElementById("taskDesc").value;
    const bulletLines = description
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && /^[-•*]\s/.test(line)); // Keep only real bullet lines

    const formattedDescription = `<ol>\n${bulletLines
        .map(line => {
            const clean = line.replace(/^[-•*]\s*/, '');
            return `<li>${clean}</li>`;
        })
        .join('\n')}\n</ol>`;



    const org = CONFIG.ORGANIZATION; // From your URL: https://dev.azure.com/codeViz/CodeViz
    const project = CONFIG.PROJECT_NAME; // Your project name
    const pat = CONFIG.PAT; // 👈 Replace with real PAT

    const response = await fetch(`https://dev.azure.com/${org}/${project}/_apis/wit/workitems/$Task?api-version=6.0`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json-patch+json",
            "Authorization": "Basic " + btoa(":" + pat)
        },
        body: JSON.stringify([
            {
                op: "add",
                path: "/fields/System.Title",
                value: title
            },
            {
                op: "add",
                path: "/fields/System.Description",
                value: formattedDescription
            }

        ])
    });

    const result = await response.json();

    if (!response.ok) {
        console.error("Azure DevOps API error:", result);
        alert("Failed to create task. See console for details.");
        return;
    }

    alert(`✅ Task created! ID: ${result.id}`);
};

