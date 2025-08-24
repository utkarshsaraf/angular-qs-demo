# QuickSight Lambda Job - Angular Demo

This project contains a Lambda function that generates QuickSight embed URLs for anonymous users, designed to work with an Angular frontend application.

## 🚀 Features

- **AWS Lambda Function** for generating QuickSight embed URLs
- **Anonymous user access** to QuickSight topics
- **Comprehensive logging** with CloudWatch integration
- **Standalone testing function** for local development
- **Angular frontend integration** ready

## 📋 Prerequisites

- AWS Account with QuickSight access
- AWS CLI configured
- QuickSight topics published in your account
- IAM permissions for Lambda, CloudWatch, and QuickSight

## 🛠️ AWS CloudShell Setup Commands

### 1. Clone and Navigate to Project

```bash
# Clone the repository
git clone https://github.com/yourusername/angular-qs-demo.git
cd angular-qs-demo

# List project structure
ls -la
```

### 2. Install Dependencies

```bash
# Install Python dependencies
pip install boto3

# Or create requirements.txt and install
echo "boto3>=1.26.0" > requirements.txt
pip install -r requirements.txt
```

### 3. Create IAM Role for Lambda

```bash
# Create trust policy document
cat > trust-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

# Create IAM role
aws iam create-role \
  --role-name QuickSightLambdaRole \
  --assume-role-policy-document file://trust-policy.json

# Attach basic Lambda execution policy
aws iam attach-role-policy \
  --role-name QuickSightLambdaRole \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

# Create custom policy for QuickSight access
cat > quicksight-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "quicksight:ListTopics",
        "quicksight:GenerateEmbedUrlForAnonymousUser"
      ],
      "Resource": "*"
    }
  ]
}
EOF

# Create and attach QuickSight policy
aws iam create-policy \
  --policy-name QuickSightLambdaPolicy \
  --policy-document file://quicksight-policy.json

aws iam attach-role-policy \
  --role-name QuickSightLambdaRole \
  --policy-arn arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):policy/QuickSightLambdaPolicy

# Get the role ARN
ROLE_ARN=$(aws iam get-role --role-name QuickSightLambdaRole --query Role.Arn --output text)
echo "Role ARN: $ROLE_ARN"
```

### 4. Create Lambda Function

```bash
# Create deployment package
cd qs_python
zip -r ../quicksight-lambda.zip .

# Get your AWS account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo "Account ID: $ACCOUNT_ID"

# Create Lambda function
aws lambda create-function \
  --function-name quicksight-embed-generator \
  --runtime python3.9 \
  --role $ROLE_ARN \
  --handler quicksight_job.lambda_handler \
  --zip-file fileb://../quicksight-lambda.zip \
  --timeout 30 \
  --memory-size 256 \
  --environment Variables="{ACCOUNT_ID=$ACCOUNT_ID,AWS_REGION=us-east-1}"

# Verify function creation
aws lambda get-function --function-name quicksight-embed-generator
```

### 5. Test Lambda Function

```bash
# Create test event
cat > test-event.json << 'EOF'
{
  "test": "event"
}
EOF

# Invoke Lambda function
aws lambda invoke \
  --function-name quicksight-embed-generator \
  --payload file://test-event.json \
  --cli-binary-format raw-in-base64-out \
  response.json

# View response
cat response.json

# View CloudWatch logs
aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/quicksight-embed-generator"
```

### 6. Update Lambda Function

```bash
# Make changes to your code, then update
cd qs_python
zip -r ../quicksight-lambda-updated.zip .

# Update function code
aws lambda update-function-code \
  --function-name quicksight-embed-generator \
  --zip-file fileb://../quicksight-lambda-updated.zip

# Update function configuration if needed
aws lambda update-function-configuration \
  --function-name quicksight-embed-generator \
  --timeout 60 \
  --memory-size 512
```

### 7. Monitor and Debug

```bash
# View recent CloudWatch logs
aws logs filter-log-events \
  --log-group-name "/aws/lambda/quicksight-embed-generator" \
  --start-time $(date -d '1 hour ago' +%s)000

# Get function metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Duration \
  --dimensions Name=FunctionName,Value=quicksight-embed-generator \
  --start-time $(date -d '1 hour ago' --iso-8601) \
  --end-time $(date --iso-8601) \
  --period 300 \
  --statistics Average

# View function configuration
aws lambda get-function-configuration --function-name quicksight-embed-generator
```

### 8. Clean Up (Optional)

```bash
# Delete Lambda function
aws lambda delete-function --function-name quicksight-embed-generator

# Delete IAM role and policies
aws iam detach-role-policy \
  --role-name QuickSightLambdaRole \
  --policy-arn arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):policy/QuickSightLambdaPolicy

aws iam detach-role-policy \
  --role-name QuickSightLambdaRole \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

aws iam delete-role --role-name QuickSightLambdaRole

# Delete policies
aws iam delete-policy --policy-arn arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):policy/QuickSightLambdaPolicy

# Remove temporary files
rm -f quicksight-lambda.zip quicksight-lambda-updated.zip test-event.json response.json
rm -f trust-policy.json quicksight-policy.json
```

## 🔧 Configuration

### Environment Variables

The Lambda function uses these environment variables:

- `ACCOUNT_ID`: Your AWS account ID (automatically set)
- `AWS_REGION`: AWS region (defaults to us-east-1)
- `LOG_LEVEL`: Logging level (optional, defaults to INFO)

### QuickSight Configuration

- **Namespace**: Uses "default" namespace
- **Session Lifetime**: 600 minutes (10 hours)
- **Allowed Domains**: Configure for your Angular app domains

## 📱 Angular Integration

The Lambda function returns a response with:

```json
{
  "statusCode": 200,
  "body": {
    "EmbedUrl": "https://...",
    "TopicId": "topic-id",
    "TopicArn": "arn:aws:quicksight:..."
  }
}
```

Use the `EmbedUrl` in your Angular application to embed QuickSight dashboards.

## 🚨 Troubleshooting

### Common Issues

1. **IAM Permissions**: Ensure the Lambda role has QuickSight permissions
2. **QuickSight Topics**: Verify you have published topics in your account
3. **Region Mismatch**: Check that Lambda and QuickSight are in the same region
4. **Memory/Timeout**: Adjust Lambda configuration for your needs

### Debug Commands

```bash
# Check Lambda function status
aws lambda get-function --function-name quicksight-embed-generator

# View recent errors
aws logs filter-log-events \
  --log-group-name "/aws/lambda/quicksight-embed-generator" \
  --filter-pattern "ERROR"

# Test with specific event
aws lambda invoke \
  --function-name quicksight-embed-generator \
  --payload '{"debug": true}' \
  response.json
```

## 📊 Monitoring

### CloudWatch Metrics

- **Duration**: Function execution time
- **Errors**: Error count and rate
- **Throttles**: Throttling events
- **Memory**: Memory usage

### CloudWatch Logs

All print statements are automatically sent to CloudWatch for monitoring and debugging.

## 🔒 Security

- **IAM Roles**: Least privilege access
- **Environment Variables**: Secure configuration
- **Resource Policies**: QuickSight access control
- **VPC**: Can be configured for private subnets

## 📚 Additional Resources

- [AWS Lambda Documentation](https://docs.aws.amazon.com/lambda/)
- [QuickSight API Reference](https://docs.aws.amazon.com/quicksight/)
- [IAM Best Practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)
- [CloudWatch Monitoring](https://docs.aws.amazon.com/AmazonCloudWatch/)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
