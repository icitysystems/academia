# Script to monitor certificate validation and update CloudFront
$certificateArn = "arn:aws:acm:us-east-1:771643347382:certificate/6a6311dc-988c-497a-be4b-3b386c2cca8b"
$distributionId = "E16F3U4QDDUP25"
$etag = "EWVMT85W2Q6EX"
$profile = "appbuilder"

Write-Host "Monitoring certificate validation for hms.icitysystems.org..."

do {
    $status = aws acm describe-certificate --profile $profile --region us-east-1 --certificate-arn $certificateArn --query 'Certificate.Status' --output text
    Write-Host "Certificate status: $status"
    
    if ($status -eq "ISSUED") {
        Write-Host "Certificate is validated! Updating CloudFront distribution..."
        
        # Update CloudFront distribution
        $updateResult = aws cloudfront update-distribution --profile $profile --id $distributionId --distribution-config file://updated-distribution-config.json --if-match $etag 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "CloudFront distribution updated successfully!"
            break
        } else {
            Write-Host "Error updating CloudFront distribution: $updateResult"
            break
        }
    } elseif ($status -eq "FAILED") {
        Write-Host "Certificate validation failed!"
        break
    }
    
    Start-Sleep -Seconds 30
    
} while ($status -eq "PENDING_VALIDATION")

Write-Host "Script completed."