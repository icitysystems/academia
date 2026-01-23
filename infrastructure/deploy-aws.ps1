# Academia Platform - AWS Deployment Script
# This script deploys both backend and frontend stacks to AWS using CDK

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "        Academia Platform - AWS Deployment" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# Check AWS credentials
Write-Host "[1/5] Checking AWS credentials..." -ForegroundColor Yellow
try {
    $accountInfo = aws sts get-caller-identity | ConvertFrom-Json
    Write-Host "✓ AWS Account: $($accountInfo.Account)" -ForegroundColor Green
    Write-Host "✓ AWS Region: us-east-1" -ForegroundColor Green
} catch {
    Write-Host "✗ AWS credentials are not configured or invalid" -ForegroundColor Red
    Write-Host "  Please run 'aws configure' to set up your credentials" -ForegroundColor Yellow
    exit 1
}

# Set environment variables
$env:CDK_DEFAULT_ACCOUNT = $accountInfo.Account
$env:CDK_DEFAULT_REGION = "us-east-1"
$env:AWS_REGION = "us-east-1"

# Build backend
Write-Host ""
Write-Host "[2/5] Building backend..." -ForegroundColor Yellow
Set-Location $PSScriptRoot\..\backend
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Backend build failed" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Backend built successfully" -ForegroundColor Green

# Build frontend
Write-Host ""
Write-Host "[3/5] Building frontend..." -ForegroundColor Yellow
Set-Location $PSScriptRoot\..\frontend
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Frontend build failed" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Frontend built successfully" -ForegroundColor Green

# Synthesize CDK stacks
Write-Host ""
Write-Host "[4/5] Synthesizing CDK stacks..." -ForegroundColor Yellow
Set-Location $PSScriptRoot\cdk
npm run synth
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ CDK synthesis failed" -ForegroundColor Red
    exit 1
}
Write-Host "✓ CDK stacks synthesized successfully" -ForegroundColor Green

# Deploy to AWS
Write-Host ""
Write-Host "[5/5] Deploying to AWS..." -ForegroundColor Yellow
Write-Host "This may take 10-20 minutes..." -ForegroundColor Cyan
npx cdk deploy --all --require-approval never --outputs-file ./deploy-output.json
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Deployment failed" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Deployment completed successfully" -ForegroundColor Green

# Get CloudFront distribution ID from outputs
Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "        Deployment Complete!" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Cyan

if (Test-Path "./deploy-output.json") {
    $outputs = Get-Content "./deploy-output.json" | ConvertFrom-Json
    
    Write-Host ""
    Write-Host "Deployment Outputs:" -ForegroundColor Yellow
    
    # Backend outputs
    if ($outputs.AcademiaBackendStack) {
        Write-Host ""
        Write-Host "Backend Stack:" -ForegroundColor Cyan
        $outputs.AcademiaBackendStack.PSObject.Properties | ForEach-Object {
            Write-Host "  $($_.Name): $($_.Value)" -ForegroundColor White
        }
    }
    
    # Frontend outputs
    if ($outputs.AcademiaFrontendStack) {
        Write-Host ""
        Write-Host "Frontend Stack:" -ForegroundColor Cyan
        $outputs.AcademiaFrontendStack.PSObject.Properties | ForEach-Object {
            Write-Host "  $($_.Name): $($_.Value)" -ForegroundColor White
        }
        
        # Get CloudFront distribution ID for invalidation
        $cfDistId = $outputs.AcademiaFrontendStack.CloudFrontDistributionId
        if ($cfDistId) {
            Write-Host ""
            Write-Host "Creating CloudFront invalidation..." -ForegroundColor Yellow
            aws cloudfront create-invalidation --distribution-id $cfDistId --paths "/*" | Out-Null
            Write-Host "✓ CloudFront cache invalidated" -ForegroundColor Green
        }
    }
}

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Access your application at the CloudFront URL above" -ForegroundColor White
Write-Host "2. Configure DNS records if using a custom domain" -ForegroundColor White
Write-Host "3. Monitor the application in AWS CloudWatch" -ForegroundColor White
Write-Host "================================================================" -ForegroundColor Cyan
