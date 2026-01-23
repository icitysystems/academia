# Academia Platform - CloudFront Invalidation Script
# This script invalidates the CloudFront cache after deployment

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "    CloudFront Cache Invalidation" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# Check for CloudFront distribution ID
$outputFile = "$PSScriptRoot\cdk\deploy-output.json"

if (Test-Path $outputFile) {
    $outputs = Get-Content $outputFile | ConvertFrom-Json
    
    if ($outputs.AcademiaFrontendStack.CloudFrontDistributionId) {
        $cfDistId = $outputs.AcademiaFrontendStack.CloudFrontDistributionId
        
        Write-Host "CloudFront Distribution ID: $cfDistId" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Creating invalidation for all paths (/*) ..." -ForegroundColor Yellow
        
        $result = aws cloudfront create-invalidation `
            --distribution-id $cfDistId `
            --paths "/*" | ConvertFrom-Json
        
        if ($result.Invalidation) {
            Write-Host ""
            Write-Host "✓ Invalidation created successfully!" -ForegroundColor Green
            Write-Host "  Invalidation ID: $($result.Invalidation.Id)" -ForegroundColor White
            Write-Host "  Status: $($result.Invalidation.Status)" -ForegroundColor White
            Write-Host ""
            Write-Host "The cache will be cleared shortly (usually takes 1-2 minutes)" -ForegroundColor Cyan
        } else {
            Write-Host "✗ Failed to create invalidation" -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "✗ CloudFront Distribution ID not found in outputs" -ForegroundColor Red
        Write-Host "  Please run deploy-aws.ps1 first" -ForegroundColor Yellow
        exit 1
    }
} else {
    Write-Host "✗ Deployment output file not found: $outputFile" -ForegroundColor Red
    Write-Host "  Please run deploy-aws.ps1 first" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "To check invalidation status, run:" -ForegroundColor Yellow
Write-Host "aws cloudfront get-invalidation --distribution-id $cfDistId --id $($result.Invalidation.Id)" -ForegroundColor White
Write-Host "================================================================" -ForegroundColor Cyan
