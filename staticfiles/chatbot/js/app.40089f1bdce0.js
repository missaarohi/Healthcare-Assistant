document.addEventListener("DOMContentLoaded", function () {
    const chatWindow = document.getElementById("chatWindow");
    const suggestionArea = document.getElementById("suggestionArea");
    const userInput = document.getElementById("userInput");
    const sendBtn = document.getElementById("sendBtn");
    const startBtn = document.getElementById("startBtn");
    const emptyState = document.getElementById("emptyState");

    let step = "not_started";
    let userAge = "";
    let existingDiseases = [];
    let selectedSymptoms = new Set();

    const symptomNodes = document.querySelectorAll("#symptomData span");
    const allSymptoms = Array.from(symptomNodes).map(node => node.dataset.symptom);

    if (!startBtn) {
        console.error("Start button not found. Check id='startBtn' in chat.html");
        return;
    }

    startBtn.addEventListener("click", startHealthCheck);
    sendBtn.addEventListener("click", handleSend);

    userInput.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
            handleSend();
        }
    });

    userInput.addEventListener("input", function () {
        if (step === "symptom_typing") {
            showSymptomSuggestions(userInput.value.trim());
        }
    });

    function startHealthCheck() {
        emptyState.style.display = "none";
        clearSuggestions();

        addBotMessage(`Hi ${USERNAME} 👋`);
        addBotMessage("I am Healtho. I will ask a few questions and then suggest a possible disease based on your symptoms.");
        addBotMessage("First, please enter your age.");

        step = "age";
        enableInput("Enter your age, for example 21");
    }

    function handleSend() {
        const value = userInput.value.trim();

        if (!value) return;

        if (step === "age") {
            handleAge(value);
            return;
        }

        if (step === "symptom_typing") {
            addTypedSymptom(value);
            return;
        }
    }

    function handleAge(value) {
        if (isNaN(value) || Number(value) <= 0 || Number(value) > 120) {
            addBotMessage("Please enter a valid age.");
            return;
        }

        userAge = value;
        addUserMessage(value);
        userInput.value = "";

        disableInput();
        askExistingDisease();
    }

    function askExistingDisease() {
        step = "existing_disease";
        clearSuggestions();

        addBotMessage("Do you already have any health condition? Select one or more options.");

        const diseases = ["Diabetes", "Blood Pressure", "Asthma", "Heart Problem", "Thyroid", "None"];

        diseases.forEach(disease => {
            const btn = document.createElement("button");
            btn.className = "option-chip";
            btn.innerText = disease;

            btn.addEventListener("click", function () {
                if (disease === "None") {
                    existingDiseases = ["None"];

                    document.querySelectorAll(".option-chip").forEach(item => {
                        item.classList.remove("selected-chip");
                    });

                    btn.classList.add("selected-chip");
                    return;
                }

                existingDiseases = existingDiseases.filter(item => item !== "None");

                if (existingDiseases.includes(disease)) {
                    existingDiseases = existingDiseases.filter(item => item !== disease);
                    btn.classList.remove("selected-chip");
                } else {
                    existingDiseases.push(disease);
                    btn.classList.add("selected-chip");
                }
            });

            suggestionArea.appendChild(btn);
        });

        const continueBtn = document.createElement("button");
        continueBtn.className = "continue-action";
        continueBtn.innerText = "Continue";

        continueBtn.addEventListener("click", function () {
            if (existingDiseases.length === 0) {
                addBotMessage("Please select at least one option.");
                return;
            }

            addUserMessage(existingDiseases.join(", "));
            askFirstSymptom();
        });

        suggestionArea.appendChild(continueBtn);
    }

    function askFirstSymptom() {
        clearSuggestions();

        step = "symptom_typing";

        addBotMessage("Now type your first symptom.");
        addBotMessage("Example: headache, fever, cough, vomiting, chest pain.");

        enableInput("Type your symptom here...");
    }

    function showSymptomSuggestions(searchText) {
        clearSuggestions();

        if (!searchText) return;

        const normalizedSearch = searchText.toLowerCase().replaceAll(" ", "_");

        const matchedSymptoms = allSymptoms
            .filter(symptom => {
                const raw = symptom.toLowerCase();
                const formatted = formatSymptom(symptom).toLowerCase();
                return raw.includes(normalizedSearch) || formatted.includes(searchText.toLowerCase());
            })
            .slice(0, 8);

        if (matchedSymptoms.length === 0) {
            const info = document.createElement("span");
            info.className = "option-chip";
            info.innerText = "No exact match. Press Enter to add typed symptom.";
            suggestionArea.appendChild(info);
            return;
        }

        matchedSymptoms.forEach(symptom => {
            const btn = document.createElement("button");
            btn.className = "symptom-chip";
            btn.innerText = formatSymptom(symptom);

            btn.addEventListener("click", function () {
                addSymptom(symptom);
                userInput.value = "";
            });

            suggestionArea.appendChild(btn);
        });
    }

    function addTypedSymptom(value) {
        const normalized = value.toLowerCase().replaceAll(" ", "_");

        const exactMatch = allSymptoms.find(symptom => symptom.toLowerCase() === normalized);
        const partialMatch = allSymptoms.find(symptom => {
            return symptom.toLowerCase().includes(normalized) ||
                   formatSymptom(symptom).toLowerCase().includes(value.toLowerCase());
        });

        const symptomToAdd = exactMatch || partialMatch || normalized;

        addSymptom(symptomToAdd);
        userInput.value = "";
    }

    function addSymptom(symptom) {
        if (selectedSymptoms.has(symptom)) {
            addBotMessage(`${formatSymptom(symptom)} is already added.`);
            return;
        }

        selectedSymptoms.add(symptom);

        addUserMessage(formatSymptom(symptom));
        addBotMessage(`${formatSymptom(symptom)} added. Type another symptom or click Predict Disease.`);

        showSelectedSymptoms();
        showPredictButton();
    }

    function showSelectedSymptoms() {
        clearSuggestions();

        selectedSymptoms.forEach(symptom => {
            const chip = document.createElement("button");
            chip.className = "symptom-chip selected-chip";
            chip.innerText = "✓ " + formatSymptom(symptom);

            chip.addEventListener("click", function () {
                selectedSymptoms.delete(symptom);
                addBotMessage(`${formatSymptom(symptom)} removed.`);
                showSelectedSymptoms();
                showPredictButton();
            });

            suggestionArea.appendChild(chip);
        });
    }

    function showPredictButton() {
        const predictBtn = document.createElement("button");
        predictBtn.className = "continue-action predict-action";
        predictBtn.innerText = "Predict Disease";

        predictBtn.addEventListener("click", predictDisease);

        suggestionArea.appendChild(predictBtn);
    }

    function predictDisease() {
        if (selectedSymptoms.size === 0) {
            addBotMessage("Please add at least one symptom.");
            return;
        }

        const selectedText = Array.from(selectedSymptoms).map(formatSymptom).join(", ");
        addUserMessage(`Predict based on: ${selectedText}`);

        clearSuggestions();
        disableInput();

        addBotMessage("Checking your symptoms...");

        fetch(PREDICT_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-CSRFToken": getCookie("csrftoken")
            },
            body: JSON.stringify({
                age: userAge,
                existing_diseases: existingDiseases,
                symptoms: Array.from(selectedSymptoms)
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                addBotMessage(data.error);
                showRestart();
                return;
            }

            addBotMessage(`
                <b>Prediction Result</b><br><br>
                Possible Disease: <b>${data.disease}</b><br>
                Risk Score: <b>${data.risk_score}</b><br>
                Advice: ${data.doctor_advice}
            `);

            if (data.related_symptoms && data.related_symptoms.length > 0) {
                addBotMessage(
                    "Other related symptoms can be: " +
                    data.related_symptoms.map(formatSymptom).join(", ")
                );
            }

            if (data.graph_base64) {
                addBotMessage(`
                    <b>Risk Graph</b><br><br>
                    <img class="risk-graph" src="data:image/png;base64,${data.graph_base64}" alt="Risk Graph">
                `);
            }

            showRestart();
        })
        .catch(error => {
            console.error(error);
            addBotMessage("Something went wrong. Please check server.");
            showRestart();
        });
    }

    function showRestart() {
        clearSuggestions();

        const restartBtn = document.createElement("button");
        restartBtn.className = "option-chip";
        restartBtn.innerText = "Start Again";

        restartBtn.addEventListener("click", function () {
            step = "age";
            userAge = "";
            existingDiseases = [];
            selectedSymptoms = new Set();

            clearSuggestions();
            addBotMessage("Okay, let's start again. Please enter your age.");
            enableInput("Enter your age, for example 21");
        });

        suggestionArea.appendChild(restartBtn);
    }

    function addBotMessage(message) {
        const row = document.createElement("div");
        row.className = "message-row bot-message-row";

        row.innerHTML = `
            <div class="message-avatar">🩺</div>
            <div class="message-bubble bot-bubble">${message}</div>
        `;

        chatWindow.appendChild(row);
        scrollBottom();
    }

    function addUserMessage(message) {
        const row = document.createElement("div");
        row.className = "message-row user-message-row";

        row.innerHTML = `
            <div class="message-bubble user-bubble">${message}</div>
        `;

        chatWindow.appendChild(row);
        scrollBottom();
    }

    function enableInput(placeholder) {
        userInput.disabled = false;
        sendBtn.disabled = false;
        userInput.placeholder = placeholder;
        userInput.focus();
    }

    function disableInput() {
        userInput.disabled = true;
        sendBtn.disabled = true;
        userInput.placeholder = "Healtho is processing...";
    }

    function clearSuggestions() {
        suggestionArea.innerHTML = "";
    }

    function scrollBottom() {
        chatWindow.scrollTop = chatWindow.scrollHeight;
    }

    function formatSymptom(symptom) {
        return symptom
            .replaceAll("_", " ")
            .replace(/\b\w/g, char => char.toUpperCase());
    }

    function getCookie(name) {
        let cookieValue = null;

        if (document.cookie && document.cookie !== "") {
            const cookies = document.cookie.split(";");

            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();

                if (cookie.substring(0, name.length + 1) === (name + "=")) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }

        return cookieValue;
    }
});