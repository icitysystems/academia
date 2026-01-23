# Academia AWS CDK Deployment Script (Serverless/Lambda)
# This script deploys the Academia application to AWS using CDK with Lambda

param(
    [Parameter()]
    [ValidateSet("all", "infrastructure", "backend", "frontend")]
    [string]$Target = "all",
    
    [Parameter()]
    [string]$HostedZoneId,
    
    [Parameter()]
    [string]$Profile = "appbuilder",
    
    [Parameter()]
    [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"

# Configuration
$AWS_REGION = if ($env:AWS_REGION) { $env:AWS_REGION } else { "us-east-1" }
$DOMAIN = "academia.icitysystems.org"

function Write-Info { param($Message) Write-Host "[INFO] $Message" -ForegroundColor Green }
function Write-Warn { param($Message) Write-Host "[WARN] $Message" -ForegroundColor Yellow }
function Write-Err { param($Message) Write-Host "[ERROR] $Message" -ForegroundColor Red }

function Test-Prerequisites {
    Write-Info "Checking prerequisites..."
    
    # Check AWS CLI
    if (-not (Get-Command "aws" -ErrorAction SilentlyContinue)) {
        Write-Err "AWS CLI is required. Install from https://aws.amazon.com/cli/"
        exit 1
    }
    
    # Check Node.js
    if (-not (Get-Command "node" -ErrorAction SilentlyContinue)) {
        Write-Err "Node.js is required. Install from https://nodejs.org/"
        exit 1
    }
    
    # Check AWS credentials
    try {
        $identity = aws sts get-caller-identity --profile $Profile --region $AWS_REGION 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Err "AWS credentials not configured or invalid for profile '$Profile'."
            Write-Err "Please run 'aws configure --profile $Profile' and enter valid credentials."
            exit 1
        }
        Write-Info "AWS credentials configured: $identity"
    } catch {
        Write-Err "AWS credentials not configured. Run 'aws configure --profile $Profile'"
        exit 1
    }
    
    Write-Info "All prerequisites met."
}

function Install-CdkDependencies {
    Write-Info "Installing CDK dependencies..."
    Push-Location "$PSScriptRoot\cdk"
    npm install
    Pop-Location
}

function Install-BackendDependencies {
    Write-Info "Installing Backend dependencies..."
    Push-Location "$PSScriptRoot\..\backend"
    npm install
    npx prisma generate
    Pop-Location
}

function Build-Backend {
    Write-Info "Building backend for Lambda deployment..."
    
    Push-Location "$PSScriptRoot\..\backend"
    
    # Build TypeScript
    Write-Info "Compiling TypeScript..."
    npm run build
    
    # Get Lambda function name
    $LAMBDA_NAME = aws cloudformation describe-stacks `
        --stack-name AcademiaBackendStack `
        --query "Stacks[0].Outputs[?OutputKey=='LambdaFunctionName'].OutputValue" `
        --output text `
        --profile $Profile `
        --region $AWS_REGION
    
    if (-not $LAMBDA_NAME) {
        Write-Err "Could not get Lambda function name. Deploy infrastructure first."
        Pop-Location
        return
    }
    
    Write-Info "Lambda function: $LAMBDA_NAME"
    
    # Create deployment package
    Write-Info "Creating deployment package..."
    $deployDir = "$PSScriptRoot\..\backend\deploy-package"
    if (Test-Path $deployDir) { Remove-Item -Recurse -Force $deployDir }
    New-Item -ItemType Directory -Path $deployDir | Out-Null
    
    # Copy built files and dependencies
    Copy-Item -Path "$PSScriptRoot\..\backend\dist" -Destination "$deployDir\dist" -Recurse
    Copy-Item -Path "$PSScriptRoot\..\backend\node_modules" -Destination "$deployDir\node_modules" -Recurse
    Copy-Item -Path "$PSScriptRoot\..\backend\package.json" -Destination "$deployDir\"
    
    # Copy Prisma files
    if (Test-Path "$PSScriptRoot\..\backend\prisma") {
        Copy-Item -Path "$PSScriptRoot\..\backend\prisma" -Destination "$deployDir\prisma" -Recurse
    }
    
    # Create ZIP
    Write-Info "Creating ZIP file..."
    $zipPath = "$PSScriptRoot\..\backend\lambda-deployment.zip"
    if (Test-Path $zipPath) { Remove-Item -Force $zipPath }
    
    Push-Location $deployDir
    Compress-Archive -Path ".\*" -DestinationPath $zipPath -Force
    Pop-Location
    
    # Check ZIP size
    $zipSize = (Get-Item $zipPath).Length / 1MB
    Write-Info "ZIP size: $([math]::Round($zipSize, 2)) MB"
    
    if ($zipSize -gt 50) {
        Write-Warn "ZIP file is larger than 50MB. Using S3 for deployment..."
        
        # Upload to S3
        $bucketName = "academia-assets-$((aws sts get-caller-identity --profile $Profile --query 'Account' --output text))"
        $s3Key = "lambda-deployments/backend-$(Get-Date -Format 'yyyyMMddHHmmss').zip"
        
        aws s3 cp $zipPath "s3://$bucketName/$s3Key" --profile $Profile --region $AWS_REGION
        
        # Update Lambda from S3
        Write-Info "Updating Lambda function from S3..."
        aws lambda update-function-code `
            --function-name $LAMBDA_NAME `
            --s3-bucket $bucketName `
            --s3-key $s3Key `
            --profile $Profile `
            --region $AWS_REGION
    } else {
        # Update Lambda directly
        Write-Info "Updating Lambda function..."
        aws lambda update-function-code `
            --function-name $LAMBDA_NAME `
            --zip-file "fileb://$zipPath" `
            --profile $Profile `
            --region $AWS_REGION
    }
    
    # Cleanup
    Remove-Item -Recurse -Force $deployDir
    
    Pop-Location
    
    Write-Info "Backend deployed to Lambda successfully."
}

function Deploy-Infrastructure {
    Write-Info "Deploying AWS infrastructure with CDK (Lambda-based)..."
    
    Push-Location "$PSScriptRoot\cdk"
    
    # Set environment for CDK
    $env:AWS_PROFILE = $Profile
    $env:AWS_REGION = $AWS_REGION
    
    # Bootstrap CDK (only needed once per account/region)
    Write-Info "Bootstrapping CDK..."
    npx cdk bootstrap --profile $Profile
    
    # Build context args
    $contextArgs = @()
    if ($HostedZoneId) {
        $contextArgs += "-c", "hostedZoneId=$HostedZoneId"
    }
    
    # Deploy all stacks
    Write-Info "Deploying all stacks..."
    if ($contextArgs.Count -gt 0) {
        npx cdk deploy --all --require-approval never --profile $Profile @contextArgs
    } else {
        npx cdk deploy --all --require-approval never --profile $Profile
    }
    
    Pop-Location
    
    Write-Info "Infrastructure deployed successfully."
}

function Build-Frontend {
    Write-Info "Building and deploying frontend..."
    
    Push-Location "$PSScriptRoot\..\frontend"
    
    # Get S3 bucket and CloudFront distribution from CDK outputs
    $BUCKET = aws cloudformation describe-stacks `
        --stack-name AcademiaFrontendStack `
        --query "Stacks[0].Outputs[?OutputKey=='FrontendBucketName'].OutputValue" `
        --output text `
        --profile $Profile `
        --region $AWS_REGION
    
    $DIST_ID = aws cloudformation describe-stacks `
        --stack-name AcademiaFrontendStack `
        --query "Stacks[0].Outputs[?OutputKey=='DistributionId'].OutputValue" `
        --output text `
        --profile $Profile `
        --region $AWS_REGION
    
    $API_URL = aws cloudformation describe-stacks `
        --stack-name AcademiaBackendStack `
        --query "Stacks[0].Outputs[?OutputKey=='ApiUrl'].OutputValue" `
        --output text `
        --profile $Profile `
        --region $AWS_REGION
    
    if (-not $BUCKET) {
        Write-Err "Could not get S3 bucket info. Deploy infrastructure first."
        Pop-Location
        exit 1
    }
    
    # Install and build
    if (-not $SkipBuild) {
        Write-Info "Installing dependencies..."
        npm ci
        
        Write-Info "Building frontend..."
        $env:REACT_APP_GRAPHQL_URL = "$API_URL/graphql"
        npm run build
    }
    
    # Upload to S3
    Write-Info "Uploading to S3..."
    aws s3 sync build/ "s3://$BUCKET/" --delete --profile $Profile --region $AWS_REGION
    
    # Invalidate CloudFront (if distribution exists)
    if ($DIST_ID -and $DIST_ID -ne "None") {
        Write-Info "Invalidating CloudFront cache..."
        aws cloudfront create-invalidation --distribution-id $DIST_ID --paths "/*" --profile $Profile
    }
    
    Pop-Location
    
    Write-Info "Frontend deployed successfully."
}

function Show-Outputs {
    Write-Info "Getting deployment outputs..."
    
    $API_URL = aws cloudformation describe-stacks `
        --stack-name AcademiaBackendStack `
        --query "Stacks[0].Outputs[?OutputKey=='ApiUrl'].OutputValue" `
        --output text `
        --profile $Profile `
        --region $AWS_REGION
    
    $API_GATEWAY_URL = aws cloudformation describe-stacks `
        --stack-name AcademiaBackendStack `
        --query "Stacks[0].Outputs[?OutputKey=='ApiGatewayUrl'].OutputValue" `
        --output text `
        --profile $Profile `
        --region $AWS_REGION
    
    $FRONTEND_URL = aws cloudformation describe-stacks `
        --stack-name AcademiaFrontendStack `
        --query "Stacks[0].Outputs[?OutputKey=='FrontendUrl'].OutputValue" `
        --output text `
        --profile $Profile `
        --region $AWS_REGION
    
    $CF_URL = aws cloudformation describe-stacks `
        --stack-name AcademiaFrontendStack `
        --query "Stacks[0].Outputs[?OutputKey=='CloudFrontUrl'].OutputValue" `
        --output text `
        --profile $Profile `
        --region $AWS_REGION
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "   Deployment URLs" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Info "API URL: $API_URL"
    Write-Info "API Gateway URL: $API_GATEWAY_URL"
    Write-Info "Frontend URL: $FRONTEND_URL"
    Write-Info "CloudFront URL: $CF_URL"
}

function Main {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "   Academia AWS Deployment (Lambda)" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Info "Target: $Target"
    Write-Info "Profile: $Profile"
    Write-Info "Region: $AWS_REGION"
    Write-Info "Domain: $DOMAIN"
    Write-Host ""
    
    Test-Prerequisites
    Install-CdkDependencies
    Install-BackendDependencies
    
    switch ($Target) {
        "infrastructure" {
            Deploy-Infrastructure
        }
        "backend" {
            Build-Backend
        }
        "frontend" {
            Build-Frontend
        }
        "all" {
            Deploy-Infrastructure
            Build-Backend
            Build-Frontend
        }
    }
    
    Show-Outputs
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "   Deployment Complete!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
}

Main
