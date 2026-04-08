import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthServiceService } from '../../../core/services/auth-service.service';
import { ActivatedRoute, Router } from '@angular/router';
import { NotificationServiceService } from '../../../core/services/notification-service.service';

type AuthView = 'login' | 'forgotPassword' | 'signUp';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {

  loginForm!: FormGroup;
  forgotPasswordForm!: FormGroup;
  signUpForm!: FormGroup;

  currentView: AuthView = 'login';
  hidePassword = true;
  returnUrl = '/home';

  loginLoading = false;
  loginError: string | null = null;

  forgotPasswordLoading = false;
  forgotPasswordSuccess: string | null = null;
  forgotPasswordError: string | null = null;

  signUpLoading = false;
  signUpSuccess: string | null = null;
  signUpError: string | null = null;

  get isLoginView(): boolean {
    return this.currentView === 'login';
  }

  get isForgotPasswordView(): boolean {
    return this.currentView === 'forgotPassword';
  }

  get isSignUpView(): boolean {
    return this.currentView === 'signUp';
  }

  get pageTitle(): string {
    switch (this.currentView) {
      case 'forgotPassword':
        return 'Reset Password';
      case 'signUp':
        return 'Create Your Account';
      default:
        return 'Login to Musify';
    }
  }

  constructor(private formBuilder: FormBuilder, private authService: AuthServiceService, private router: Router,
    private route: ActivatedRoute, private notificationService: NotificationServiceService) {

    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]], 
    });

    this.forgotPasswordForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
    });

    this.signUpForm = this.formBuilder.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
    });

  }


  ngOnInit(): void {
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/home']);
      return;
    }

    const savedView = localStorage.getItem('authViewState') as AuthView;
    if (savedView && ['login', 'forgotPassword', 'signUp'].includes(savedView)) {
      this.currentView = savedView;
    }

    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/home';
  }

  private getErrorMessage(error: any, defaultMessage: string): string {
    if (error.status === 0) {
      return 'Network error occurred. Please try connecting again.';
    }
    if (error.error?.message) {
      return error.error.message;
    }
    return defaultMessage;
  }

  private clearMessages() {
    this.loginError = null;
    this.forgotPasswordError = null;
    this.signUpError = null;
    this.forgotPasswordSuccess = null;
    this.signUpSuccess = null;
  }

  OnForgotPasswordSubmit() {
    this.forgotPasswordLoading = true;
    this.forgotPasswordError = null;
    this.forgotPasswordSuccess = null;

    const email = this.forgotPasswordForm.value.email;

    this.authService.forgetPassword(email).subscribe({
      next: (response) => {
        this.forgotPasswordLoading = false;
        this.forgotPasswordSuccess = response.message || 'Password reset instructions sent to your email.';
        this.notificationService.success(response.message || 'Password reset instructions sent to your email.');

        setTimeout(() => this.showLoginView(), 3000);
      },
      error: (error) => {
        this.forgotPasswordLoading = false;
        this.forgotPasswordError = this.getErrorMessage(error, 'Failed to send password reset instructions.');
        this.notificationService.error(this.getErrorMessage(error, 'Failed to send password reset instructions.'));
      }
    });
  }

  showLoginView() {
    this.currentView = 'login';
    localStorage.removeItem('authViewState');
    this.clearMessages();
  }

  OnLoginSubmit() {
    this.loginLoading = true;
    this.loginError = null;

    const { email, password } = this.loginForm.value;

    this.authService.login({email, password}).subscribe({
      next: (response) => {
        this.loginLoading = false;
        this.router.navigateByUrl(this.returnUrl);
      },
      error: (error) => {
        this.loginLoading = false;
        this.loginError = this.getErrorMessage(error, 'Failed to login. Please try again.');
        this.notificationService.error(this.getErrorMessage(error, 'Failed to login. Please try again.'));
      }
    });
  }

  showSignUpView() {
    this.currentView = 'signUp';
    localStorage.setItem('authViewState', 'signUp');
    this.clearMessages();

    const loginEmail = this.loginForm.get('email')?.value;
    if (loginEmail) {
      this.signUpForm.patchValue({ email: loginEmail });
    }
  }

  showForgotPasswordView() {
    this.currentView = 'forgotPassword';
    localStorage.setItem('authViewState', 'forgotPassword');
    this.clearMessages();

    const loginEmail = this.loginForm.get('email')?.value;
    if (loginEmail) {
      this.forgotPasswordForm.patchValue({ email: loginEmail });
    }
  }

  OnSignUpSubmit() {
    this.signUpLoading = true;
    this.signUpError = null;

    const { email, name } = this.signUpForm.value;

    this.authService.signUp({ email, name }).subscribe({
      next: (response) => {
        this.signUpLoading = false;
        this.signUpSuccess = response.message || 'User registered successfully.';
        this.notificationService.success(response.message || 'User registered successfully.');
        setTimeout(() => this.showLoginView(), 3000);
      },
      error: (error) => {
        this.signUpLoading = false;
        this.signUpError = this.getErrorMessage(error, 'Failed to register user.');
        this.notificationService.error(this.getErrorMessage(error, 'Failed to register user.'));
      }
    });
  }
}