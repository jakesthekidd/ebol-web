import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { CardModule } from 'primeng/card';
import { MessageModule } from 'primeng/message';
import { AuthService } from '../auth.service';

@Component({
  selector: 'ebol-login',
  imports: [ReactiveFormsModule, ButtonModule, InputTextModule, PasswordModule, CardModule, MessageModule],
  styles: [
    `
      .login-page {
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--p-surface-ground);
        padding: 1.5rem;
      }
      .login-card {
        width: 100%;
        max-width: 400px;
      }
      .login-header {
        text-align: center;
        margin-bottom: 2rem;
      }
      .logo-mark {
        width: 48px;
        height: 48px;
        background: var(--p-primary-500);
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #fff;
        font-weight: 800;
        font-size: 16px;
        letter-spacing: 0.5px;
        margin: 0 auto 1rem;
      }
      .login-title {
        font-size: 1.375rem;
        font-weight: 700;
        color: var(--p-text-color);
        margin: 0 0 0.25rem;
      }
      .login-sub {
        font-size: 13px;
        color: var(--p-text-muted-color);
        margin: 0;
      }
      .field {
        margin-bottom: 1.25rem;
      }
      .field label {
        display: block;
        font-size: 13px;
        font-weight: 500;
        color: var(--p-text-color);
        margin-bottom: 0.375rem;
      }
      .field input,
      .field p-password {
        width: 100%;
      }
      .error-msg {
        font-size: 12px;
        color: var(--p-red-500);
        margin-top: 0.25rem;
      }
    `,
  ],
  template: `
    <div class="login-page">
      <div class="login-card">
        <div class="login-header">
          <div class="logo-mark">eB</div>
          <h1 class="login-title">EBOL Shipper Portal</h1>
          <p class="login-sub">Sign in to manage your BOLs and locations</p>
        </div>

        <p-card>
          <form [formGroup]="form" (ngSubmit)="onSubmit()">
            @if (errorMessage()) {
              <p-message severity="error" [text]="errorMessage()" styleClass="w-full mb-4" />
            }

            <div class="field">
              <label for="email">Email address</label>
              <input
                id="email"
                type="email"
                pInputText
                formControlName="email"
                placeholder="you@company.com"
                autocomplete="email"
                [style]="{ width: '100%' }"
              />
              @if (form.get('email')?.invalid && form.get('email')?.touched) {
                <div class="error-msg">Valid email required</div>
              }
            </div>

            <div class="field">
              <label for="password">Password</label>
              <p-password
                inputId="password"
                formControlName="password"
                [feedback]="false"
                [toggleMask]="true"
                placeholder="••••••••"
                autocomplete="current-password"
                [style]="{ width: '100%' }"
                [inputStyle]="{ width: '100%' }"
              />
              @if (form.get('password')?.invalid && form.get('password')?.touched) {
                <div class="error-msg">Password required</div>
              }
            </div>

            <p-button
              type="submit"
              label="Sign in"
              [loading]="loading()"
              [disabled]="form.invalid"
              [style]="{ width: '100%' }"
            />
          </form>
        </p-card>
      </div>
    </div>
  `,
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  loading = signal(false);
  errorMessage = signal('');

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  async onSubmit(): Promise<void> {
    if (this.form.invalid) return;

    this.loading.set(true);
    this.errorMessage.set('');

    try {
      const { email, password } = this.form.value;
      await this.auth.signIn(email!, password!);
      this.router.navigate(['/']);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sign in failed. Please try again.';
      this.errorMessage.set(msg);
    } finally {
      this.loading.set(false);
    }
  }
}
