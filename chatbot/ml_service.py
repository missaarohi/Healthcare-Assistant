import base64
import csv
from io import BytesIO

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

import pandas as pd
from sklearn import preprocessing
from sklearn.tree import DecisionTreeClassifier
from django.conf import settings


TRAINING_PATH = settings.BASE_DIR / "ml_data" / "Training.csv"
CONSULT_PATH = settings.BASE_DIR / "ml_data" / "doc_consult.csv"


training = pd.read_csv(TRAINING_PATH)

# Remove extra unnamed columns if present
training = training.loc[:, ~training.columns.str.contains("^Unnamed")]

cols = training.columns[:-1]
x = training[cols]
y = training["prognosis"]

label_encoder = preprocessing.LabelEncoder()
label_encoder.fit(y)
encoded_y = label_encoder.transform(y)

model = DecisionTreeClassifier(random_state=42)
model.fit(x, encoded_y)

reduced_data = training.groupby("prognosis").max()


def load_consult_data():
    consult = {}

    with open(CONSULT_PATH, "r") as file:
        reader = csv.reader(file)

        for row in reader:
            if len(row) >= 2:
                disease = row[0].strip()

                try:
                    risk = int(row[1])
                except ValueError:
                    risk = 0

                consult[disease] = risk

    return consult


consult_data = load_consult_data()


def get_all_symptoms():
    return list(cols)


def create_risk_graph(risk_score):
    labels = ["Consult Doctor", "Monitor Symptoms"]
    values = [risk_score, 100 - risk_score]

    plt.figure(figsize=(5, 3))
    plt.bar(labels, values)
    plt.ylim(0, 100)
    plt.ylabel("Risk Score")
    plt.title("Healtho Risk Analysis")

    buffer = BytesIO()
    plt.tight_layout()
    plt.savefig(buffer, format="png")
    plt.close()

    buffer.seek(0)
    image_png = buffer.getvalue()
    graph = base64.b64encode(image_png).decode("utf-8")

    return graph


def predict_disease_from_symptoms(selected_symptoms):
    selected_symptoms = set(selected_symptoms)

    input_data = []

    for symptom in cols:
        if symptom in selected_symptoms:
            input_data.append(1)
        else:
            input_data.append(0)

    input_df = pd.DataFrame([input_data], columns=cols)

    prediction = model.predict(input_df)[0]
    disease = label_encoder.inverse_transform([prediction])[0]

    risk_score = consult_data.get(disease, 0)

    if risk_score > 50:
        doctor_advice = "You should consult a doctor as soon as possible."
    else:
        doctor_advice = "You may consult a doctor if symptoms continue."

    related_symptoms = []

    if disease in reduced_data.index:
        disease_row = reduced_data.loc[disease]
        related_symptoms = [
            symptom for symptom, value in disease_row.items()
            if value == 1
        ]

    graph_base64 = create_risk_graph(risk_score)

    return {
        "disease": disease,
        "risk_score": risk_score,
        "doctor_advice": doctor_advice,
        "related_symptoms": related_symptoms[:10],
        "graph_base64": graph_base64
    }