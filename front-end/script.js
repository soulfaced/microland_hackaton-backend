async function askQuestion() {
    const question = document.getElementById('question').value;
    const answerContainer = document.getElementById('answer-container');
    const answerElement = document.getElementById('answer');

    if (!question.trim()) {
        alert("Please enter a question.");
        return;
    }

    // Show loading text while waiting for response
    answerElement.textContent = "Loading...";
    answerContainer.classList.remove('hidden');

    try {
        const response = await fetch('http://localhost:3000/ask', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question })
        });

        if (response.ok) {
            const data = await response.json();
            answerElement.textContent = data.answer;
        } else {
            answerElement.textContent = "Sorry, something went wrong. Please try again.";
        }
    } catch (error) {
        console.error('Error:', error);
        answerElement.textContent = "Sorry, an error occurred. Please try again.";
    }
}
