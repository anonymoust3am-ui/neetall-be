/**
 * Email Service Interface
 * Implement this service with your email provider (SendGrid, Nodemailer, AWS SES, etc.)
 */

export interface IEmailService {
  sendEmailVerificationOtp(email: string, code: string): Promise<void>;
  sendWelcomeEmail(email: string, name: string): Promise<void>;
  sendPasswordResetOtp(email: string, code: string): Promise<void>;
}

/**
 * Example Implementation with Nodemailer
 * Install: npm install nodemailer
 */

import { Injectable } from '@nestjs/common';

@Injectable()
export class NodemailerEmailService implements IEmailService {
  // private transporter: any;

  // constructor() {
  //   this.transporter = nodemailer.createTransport({
  //     service: 'gmail', // or another service
  //     auth: {
  //       user: process.env.EMAIL_USER,
  //       pass: process.env.EMAIL_PASSWORD,
  //     },
  //   });
  // }

  async sendEmailVerificationOtp(email: string, code: string): Promise<void> {
    // await this.transporter.sendMail({
    //   from: process.env.EMAIL_USER,
    //   to: email,
    //   subject: 'Email Verification OTP',
    //   html: `
    //     <h1>Verify Your Email</h1>
    //     <p>Your verification code is: <strong>${code}</strong></p>
    //     <p>This code expires in 10 minutes.</p>
    //   `,
    // });

    console.log(`📧 Email OTP for ${email}: ${code}`); // For development
  }

  async sendWelcomeEmail(email: string, name: string): Promise<void> {
    // await this.transporter.sendMail({
    //   from: process.env.EMAIL_USER,
    //   to: email,
    //   subject: 'Welcome to Neetall!',
    //   html: `
    //     <h1>Welcome ${name}!</h1>
    //     <p>Thank you for joining Neetall.</p>
    //   `,
    // });

    console.log(`👋 Welcome email sent to ${email}`);
  }

  async sendPasswordResetOtp(email: string, code: string): Promise<void> {
    // await this.transporter.sendMail({
    //   from: process.env.EMAIL_USER,
    //   to: email,
    //   subject: 'Password Reset OTP',
    //   html: `
    //     <h1>Reset Your Password</h1>
    //     <p>Your reset code is: <strong>${code}</strong></p>
    //     <p>This code expires in 15 minutes.</p>
    //   `,
    // });

    console.log(`🔑 Password reset OTP for ${email}: ${code}`);
  }
}
