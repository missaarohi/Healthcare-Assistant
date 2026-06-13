from django.urls import path
from . import views

urlpatterns = [
    path('', views.home, name='home'),

    path('login/', views.login_view, name='login'),
    path('signup/', views.signup_view, name='signup'),
    path('logout/', views.logout_view, name='logout'),

    path('chat/', views.chat_page, name='chat'),
    path('admin-dashboard/', views.admin_dashboard, name='admin_dashboard'),

    path('api/predict/', views.predict_disease, name='predict_disease'),
]