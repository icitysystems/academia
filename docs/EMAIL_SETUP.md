# Academia Email Configuration

## Overview

The Academia platform uses AWS Simple Email Service (SES) for sending and receiving emails at `academia@icitysystems.org`.

## Email Setup

### Sending Emails

- **From Address**: `academia@icitysystems.org`
- **Provider**: AWS SES (us-east-1 region)
- **Status**: Domain verified ✓

### Receiving Emails

- **Receiving Address**: `academia@icitysystems.org`
- **Forwarding To**: `icitysystems@gmail.com`
- **MX Record**: `inbound-smtp.us-east-1.amazonaws.com` (priority 10)

## AWS Resources

### SES Configuration

- **Domain Identity**: `icitysystems.org` (verified)
- **Active Rule Set**: `ccored-email-rules-prod`
- **Receipt Rule**: `academia-forward-rule`

### Infrastructure (AcademiaSes Stack)

- **S3 Bucket**: `academia-emails-771643347382` - Stores incoming emails
- **Lambda Function**: `academia-email-forwarder` - Forwards emails to Gmail

## How It Works

1. **Sending**: When the backend sends emails (verification, password reset, notifications), it uses the `EmailService` configured to send via AWS SES.

2. **Receiving**:
   - Emails sent to `academia@icitysystems.org` are received by SES
   - SES stores the email in the S3 bucket
   - Lambda function processes and forwards the email to `icitysystems@gmail.com`
   - The forwarded email includes `[Fwd: Academia]` prefix in subject
   - Reply-To header is set to original sender

## Environment Variables

The backend requires these environment variables for email sending:

```env
EMAIL_PROVIDER=ses
EMAIL_FROM=academia@icitysystems.org
EMAIL_FROM_NAME=Academia Platform
AWS_SES_REGION=us-east-1
# AWS credentials are typically provided via IAM role
```

## Testing

Send a test email using AWS CLI:

```bash
aws ses send-email --region us-east-1 \
  --from academia@icitysystems.org \
  --to icitysystems@gmail.com \
  --subject "Test from Academia" \
  --text "This is a test email."
```

## Production Notes

- **Sandbox Mode**: The SES account has a 200 emails/day limit
- To increase limits, request production access in AWS SES console
- All recipients must be verified while in sandbox mode

## Troubleshooting

### Emails not forwarding

1. Check Lambda logs in CloudWatch for errors
2. Verify the S3 bucket has incoming emails
3. Ensure Gmail address is verified in SES

### Cannot send emails

1. Verify domain identity is verified
2. Check IAM permissions include `ses:SendEmail`
3. Ensure `EMAIL_PROVIDER=ses` is set

### Bounce handling

- SES feedback forwarding is enabled
- Bounces are sent to the configured notification topic
