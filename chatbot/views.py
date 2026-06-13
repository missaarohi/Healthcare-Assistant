import json

from django.shortcuts import render, redirect
from django.contrib.auth.models import User
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.views.decorators.http import require_POST

from .models import ChatHistory
from .ml_service import get_all_symptoms, predict_disease_from_symptoms


def home(request):
    return render(request, 'chatbot/index.html')


def signup_view(request):
    if request.method == 'POST':
        username = request.POST.get('username')
        email = request.POST.get('email')
        password = request.POST.get('password')

        if User.objects.filter(username=username).exists():
            return render(request, 'chatbot/signup.html', {
                'error': 'Username already exists. Please choose another username.'
            })

        user = User.objects.create_user(
            username=username,
            email=email,
            password=password
        )

        login(request, user)
        return redirect('chat')

    return render(request, 'chatbot/signup.html')


def login_view(request):
    if request.method == 'POST':
        username = request.POST.get('username')
        password = request.POST.get('password')

        user = authenticate(request, username=username, password=password)

        if user is not None:
            login(request, user)

            if user.is_staff or user.is_superuser:
                return redirect('admin_dashboard')

            return redirect('chat')

        return render(request, 'chatbot/login.html', {
            'error': 'Invalid username or password.'
        })

    return render(request, 'chatbot/login.html')


def logout_view(request):
    logout(request)
    return redirect('home')


@login_required
def chat_page(request):
    symptoms = get_all_symptoms()

    return render(request, 'chatbot/chat.html', {
        'symptoms': symptoms
    })


@login_required
def admin_dashboard(request):
    if not request.user.is_staff and not request.user.is_superuser:
        return redirect('chat')

    users = User.objects.all().order_by('-date_joined')
    chats = ChatHistory.objects.all().order_by('-created_at')

    return render(request, 'chatbot/admin_dashboard.html', {
        'users': users,
        'chats': chats
    })


@login_required
@require_POST
def predict_disease(request):
    try:
        data = json.loads(request.body)

        selected_symptoms = data.get("symptoms", [])
        age = data.get("age", "")
        existing_diseases = data.get("existing_diseases", [])

        if not selected_symptoms:
            return JsonResponse({
                "error": "Please select at least one symptom."
            }, status=400)

        result = predict_disease_from_symptoms(selected_symptoms)

        message = (
            f"Age: {age}, "
            f"Existing diseases: {', '.join(existing_diseases)}, "
            f"Symptoms: {', '.join(selected_symptoms)}"
        )

        ChatHistory.objects.create(
            user=request.user,
            message=message,
            predicted_disease=result["disease"],
            doctor_advice=result["doctor_advice"]
        )

        return JsonResponse(result)

    except Exception as e:
        return JsonResponse({
            "error": str(e)
        }, status=500)