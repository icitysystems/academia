const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

try {
  // Get distribution config
  console.log('Fetching CloudFront distribution config...');
  const cmd1 = 'aws cloudfront get-distribution-config --id E2HWZ3S4Q8T4IB --profile appbuilder --output json';
  const output = execSync(cmd1, { encoding: 'utf-8' });
  
  // Parse JSON (handle BOM)
  let json = output;
  if (json.charCodeAt(0) === 0xFEFF) {
    json = json.slice(1);
  }
  const data = JSON.parse(json);
  const etag = data.ETag;
  const config = data.DistributionConfig;
  
  console.log(`✓ Got config with ETag: ${etag}`);
  
  // Update DefaultRootObject
  config.DefaultRootObject = 'index.html';
  
  // Update error responses
  config.CustomErrorResponses = {
    Quantity: 2,
    Items: [
      { ErrorCode: 403, ResponsePagePath: '/index.html', ResponseCode: '200', ErrorCachingMinTTL: 300 },
      { ErrorCode: 404, ResponsePagePath: '/index.html', ResponseCode: '200', ErrorCachingMinTTL: 300 }
    ]
  };
  
  // Save config to file
  const configFile = path.join(process.cwd(), 'cf-config-update.json');
  fs.writeFileSync(configFile, JSON.stringify(config), 'utf-8');
  console.log(`✓ Prepared config: ${configFile}`);
  
  // Update CloudFront
  console.log('Updating CloudFront distribution...');
  const cmd2 = `aws cloudfront update-distribution --id E2HWZ3S4Q8T4IB --distribution-config file://${configFile} --if-match ${etag} --profile appbuilder --output json`;
  const result = execSync(cmd2, { encoding: 'utf-8' });
  
  // Parse result
  let resultJson = result;
  if (resultJson.charCodeAt(0) === 0xFEFF) {
    resultJson = resultJson.slice(1);
  }
  const distribution = JSON.parse(resultJson);
  
  console.log('\n✓ CloudFront distribution updated successfully!');
  console.log(`  Distribution ID: ${distribution.Distribution.Id}`);
  console.log(`  Status: ${distribution.Distribution.Status}`);
  console.log(`  DefaultRootObject: ${distribution.Distribution.DistributionConfig.DefaultRootObject}`);
  console.log(`  Error Responses: ${distribution.Distribution.DistributionConfig.CustomErrorResponses.Quantity}`);
  console.log(`  Last Modified: ${distribution.Distribution.LastModifiedTime}`);
  
  // Clean up
  fs.unlinkSync(configFile);
  
} catch (error) {
  console.error('✗ Error:', error.message);
  process.exit(1);
}
