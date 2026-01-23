const { execSync } = require('child_process');
const fs = require('fs');

try {
  console.log('Fetching current CloudFront configuration...');
  const output = execSync('aws cloudfront get-distribution-config --id E2HWZ3S4Q8T4IB --profile appbuilder --output json', { encoding: 'utf-8' });
  
  let json = output;
  if (json.charCodeAt(0) === 0xFEFF) json = json.slice(1);
  
  const data = JSON.parse(json);
  const config = data.DistributionConfig;
  const etag = data.ETag;
  
  console.log('Current Origins:');
  config.Origins.Items.forEach((origin, i) => {
    console.log(`  ${i + 1}. ID: ${origin.Id}`);
    console.log(`     Domain: ${origin.DomainName}`);
    console.log(`     OriginPath: '${origin.OriginPath}'`);
    console.log(`     Protocol: ${origin.CustomOriginConfig ? origin.CustomOriginConfig.OriginProtocolPolicy : 'N/A'}`);
  });
  
  console.log(`\nDefault Target Origin: ${config.DefaultCacheBehavior.TargetOriginId}`);
  
  // Fix the origins - use only one S3 website origin without problematic path
  const fixedOrigins = {
    Quantity: 1,
    Items: [{
      Id: 'academia-s3-website',
      DomainName: 'academia.icitysystems.org.s3-website-us-east-1.amazonaws.com',
      OriginPath: '',  // Remove the problematic /index.html path
      CustomHeaders: { Quantity: 0 },
      CustomOriginConfig: {
        HTTPPort: 80,
        HTTPSPort: 443,
        OriginProtocolPolicy: 'http-only',  // S3 static website only supports HTTP
        OriginSslProtocols: {
          Quantity: 1,
          Items: ['TLSv1.2']
        },
        OriginReadTimeout: 30,
        OriginKeepaliveTimeout: 5,
        IpAddressType: 'ipv4'
      },
      ConnectionAttempts: 3,
      ConnectionTimeout: 10,
      OriginShield: { Enabled: false },
      OriginAccessControlId: ''
    }]
  };
  
  config.Origins = fixedOrigins;
  config.DefaultCacheBehavior.TargetOriginId = 'academia-s3-website';
  
  fs.writeFileSync('cf-config-fixed.json', JSON.stringify(config), 'utf-8');
  
  console.log('\n✓ Fixed origins configuration:');
  console.log('  • Removed problematic origin with /index.html path');
  console.log('  • Set single S3 website origin');
  console.log('  • Updated default behavior target');
  console.log('  • Set origin protocol to http-only (S3 website requirement)');
  
  // Apply the fix
  console.log('\nApplying CloudFront update...');
  const cmd = `aws cloudfront update-distribution --id E2HWZ3S4Q8T4IB --distribution-config file://cf-config-fixed.json --if-match ${etag} --profile appbuilder --output json`;
  const result = execSync(cmd, { encoding: 'utf-8' });
  
  let resultJson = result;
  if (resultJson.charCodeAt(0) === 0xFEFF) resultJson = resultJson.slice(1);
  const distribution = JSON.parse(resultJson);
  
  console.log('\n✓ CloudFront distribution updated successfully!');
  console.log(`  Status: ${distribution.Distribution.Status}`);
  console.log(`  Distribution ID: ${distribution.Distribution.Id}`);
  console.log('\n⚠️  CloudFront deployment takes 5-15 minutes to propagate globally.');
  console.log('   Wait for deployment to complete before testing the frontend.');
  
  // Clean up
  fs.unlinkSync('cf-config-fixed.json');
  
} catch (err) {
  console.error('✗ Error:', err.message);
  if (err.stdout) console.error('stdout:', err.stdout);
  if (err.stderr) console.error('stderr:', err.stderr);
  process.exit(1);
}