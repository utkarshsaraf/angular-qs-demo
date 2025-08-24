import json
import boto3
import os
import logging
import time
from datetime import datetime
from typing import Dict, Any, Optional

"""
AWS Lambda QuickSight Job with CloudWatch-optimized logging

This module provides comprehensive logging optimized for AWS Lambda execution:
- Structured logging for CloudWatch Insights queries
- Lambda context information (request ID, function name, version, memory)
- Performance metrics (execution time, memory usage)
- Error correlation with request context
- Environment variable validation
- CloudWatch-friendly log formatting
"""

# Configure Lambda-optimized logging
def setup_logging(log_level: str = "INFO") -> logging.Logger:
    """
    Set up Lambda-optimized logging configuration for CloudWatch
    
    Args:
        log_level (str): Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
    
    Returns:
        logging.Logger: Configured logger instance
    """
    # Create logger
    logger = logging.getLogger("quicksight_job")
    logger.setLevel(getattr(logging, log_level.upper()))
    
    # Prevent duplicate handlers
    if logger.handlers:
        return logger
    
    # Create console handler (Lambda automatically sends stdout/stderr to CloudWatch)
    console_handler = logging.StreamHandler()
    console_handler.setLevel(getattr(logging, log_level.upper()))
    
    # Create formatter optimized for CloudWatch
    formatter = logging.Formatter(
        '%(asctime)s - %(levelname)s - [%(funcName)s:%(lineno)d] - %(message)s'
    )
    console_handler.setFormatter(formatter)
    
    # Add handler to logger
    logger.addHandler(console_handler)
    
    return logger

# Initialize logger with Lambda-appropriate level
logger = setup_logging(os.environ.get("LOG_LEVEL", "INFO"))

# Initialize AWS client with logging
logger.info("Initializing AWS QuickSight client")
try:
    quicksight = boto3.client("quicksight")
    logger.info("Successfully initialized QuickSight client")
except Exception as e:
    logger.error(f"Failed to initialize QuickSight client: {e}")
    raise

def lambda_handler(event, context):
    """
    AWS Lambda handler function for generating QuickSight embed URLs
    
    Args:
        event: Lambda event object
        context: Lambda context object
    
    Returns:
        dict: Response with status code and body
    """
    start_time = time.time()
    request_id = getattr(context, 'aws_request_id', 'unknown') if context else 'unknown'
    function_name = getattr(context, 'function_name', 'unknown') if context else 'unknown'
    function_version = getattr(context, 'function_version', 'unknown') if context else 'unknown'
    
    # Lambda-specific structured logging
    logger.info(f"Lambda execution started", extra={
        'request_id': request_id,
        'function_name': function_name,
        'function_version': function_version,
        'event_type': type(event).__name__,
        'event_size': len(json.dumps(event, default=str))
    })
    
    logger.debug(f"Event details: {json.dumps(event, default=str)}")
    
    try:
        # Extract environment variables
        logger.debug("Extracting environment variables")
        account_id = os.environ["ACCOUNT_ID"]
        region = os.environ.get("AWS_REGION", "us-east-1")
        namespace = "default"   # change if you have custom namespace
        
        # Lambda environment logging
        logger.info(f"Lambda environment configured", extra={
            'account_id': account_id,
            'region': region,
            'namespace': namespace,
            'lambda_function_name': function_name,
            'lambda_function_version': function_version
        })
        
        # Step 1: List topics
        logger.info("Step 1: Listing QuickSight topics")
        logger.debug(f"Calling list_topics for account: {account_id}")
        
        topics = quicksight.list_topics(AwsAccountId=account_id)
        logger.info(f"Successfully retrieved {len(topics.get('Topics', []))} topics")
        
        if not topics.get("Topics"):
            logger.error("No topics found in QuickSight account")
            return {"statusCode": 500, "body": "No topics found in QuickSight."}

        # Pick the first published topic (you can filter here if you want a specific one)
        logger.debug("Searching for published topics")
        topic = None
        published_topics = []
        
        for t in topics["Topics"]:
            logger.debug(f"Examining topic: {t.get('TopicId')} - Status: {t.get('Status')}")
            if t.get("TopicId") and t.get("Status") == "PUBLISHED":
                published_topics.append(t)
                if topic is None:  # Pick the first one
                    topic = t
                    logger.info(f"Selected topic: {t.get('TopicId')} - Name: {t.get('Name', 'Unknown')}")
        
        logger.info(f"Found {len(published_topics)} published topics out of {len(topics['Topics'])} total topics")
        
        if not topic:
            logger.error("No published topics found in QuickSight account")
            return {"statusCode": 500, "body": "No published topics found."}

        topic_id = topic["TopicId"]
        topic_arn = f"arn:aws:quicksight:{region}:{account_id}:topic/{topic_id}"
        logger.info(f"Using topic ID: {topic_id}")
        logger.debug(f"Generated topic ARN: {topic_arn}")

        # Step 2: Generate embed URL
        logger.info("Step 2: Generating embed URL for anonymous user")
        logger.debug(f"Session lifetime: 600 minutes, Allowed domains: {['http://localhost:4200', 'https://yourdomain.com']}")
        
        try:
            response = quicksight.generate_embed_url_for_anonymous_user(
                AwsAccountId=account_id,
                Namespace=namespace,
                SessionLifetimeInMinutes=600,
                AuthorizedResourceArns=[topic_arn],
                ExperienceConfiguration={
                    "QSearchBar": {
                        "InitialTopicId": topic_id
                    }
                },
                AllowedDomains=[
                    "http://localhost:4200",  # your Angular dev URL
                    "https://yourdomain.com"  # prod domain if needed
                ]
            )
            logger.info("Successfully generated embed URL")
            logger.debug(f"Response keys: {list(response.keys())}")
            
        except Exception as e:
            logger.error(f"Failed to generate embed URL: {e}", exc_info=True)
            return {"statusCode": 500, "body": str(e)}

        # Step 3: Return URL
        execution_time = time.time() - start_time
        memory_used = getattr(context, 'memory_limit_in_mb', 'unknown') if context else 'unknown'
        
        # Lambda success metrics
        logger.info(f"Lambda execution completed successfully", extra={
            'request_id': request_id,
            'execution_time_ms': round(execution_time * 1000, 2),
            'memory_used_mb': memory_used,
            'status_code': 200,
            'topics_found': len(topics.get('Topics', [])),
            'published_topics': len(published_topics)
        })
        
        result = {
            "statusCode": 200,
            "body": json.dumps({
                "EmbedUrl": response["EmbedUrl"],
                "TopicId": topic_id,
                "TopicArn": topic_arn
            })
        }
        
        logger.debug(f"Returning result: {json.dumps(result, default=str)}")
        return result
        
    except Exception as e:
        execution_time = time.time() - start_time
        memory_used = getattr(context, 'memory_limit_in_mb', 'unknown') if context else 'unknown'
        
        # Lambda error metrics
        logger.error(f"Lambda execution failed", extra={
            'request_id': request_id,
            'execution_time_ms': round(execution_time * 1000, 2),
            'memory_used_mb': memory_used,
            'error_type': type(e).__name__,
            'error_message': str(e)
        }, exc_info=True)
        
        return {"statusCode": 500, "body": f"Internal server error: {str(e)}"}

# Alternative function for non-Lambda usage
def generate_quicksight_embed_url(account_id=None, region=None):
    """
    Generate QuickSight embed URL for standalone Python usage
    
    Args:
        account_id (str): AWS account ID (if not provided, will use ACCOUNT_ID env var)
        region (str): AWS region (if not provided, will use AWS_REGION env var)
    
    Returns:
        dict: Dictionary containing embed URL and topic information
    """
    start_time = time.time()
    logger.info("Starting standalone QuickSight embed URL generation")
    
    try:
        # Validate and set parameters
        if account_id is None:
            logger.debug("Account ID not provided, checking environment variable")
            account_id = os.environ.get("ACCOUNT_ID")
            if not account_id:
                logger.error("ACCOUNT_ID environment variable not set")
                raise ValueError("ACCOUNT_ID environment variable not set")
            logger.info(f"Using ACCOUNT_ID from environment: {account_id}")
        else:
            logger.info(f"Using provided account ID: {account_id}")
        
        if region is None:
            logger.debug("Region not provided, checking environment variable")
            region = os.environ.get("AWS_REGION", "us-east-1")
            logger.info(f"Using region from environment: {region}")
        else:
            logger.info(f"Using provided region: {region}")
        
        namespace = "default"
        logger.debug(f"Using namespace: {namespace}")
        
        # List topics
        logger.info("Listing QuickSight topics")
        logger.debug(f"Calling list_topics for account: {account_id}")
        
        topics = quicksight.list_topics(AwsAccountId=account_id)
        logger.info(f"Successfully retrieved {len(topics.get('Topics', []))} topics")
        
        if not topics.get("Topics"):
            logger.error("No topics found in QuickSight account")
            raise Exception("No topics found in QuickSight")
        
        # Pick the first published topic
        logger.debug("Searching for published topics")
        topic = None
        published_topics = []
        
        for t in topics["Topics"]:
            logger.debug(f"Examining topic: {t.get('TopicId')} - Status: {t.get('Status')} - Name: {t.get('Name', 'Unknown')}")
            if t.get("TopicId") and t.get("Status") == "PUBLISHED":
                published_topics.append(t)
                if topic is None:  # Pick the first one
                    topic = t
                    logger.info(f"Selected topic: {t.get('TopicId')} - Name: {t.get('Name', 'Unknown')}")
        
        logger.info(f"Found {len(published_topics)} published topics out of {len(topics['Topics'])} total topics")
        
        if not topic:
            logger.error("No published topics found in QuickSight account")
            raise Exception("No published topics found")
        
        topic_id = topic["TopicId"]
        topic_arn = f"arn:aws:quicksight:{region}:{account_id}:topic/{topic_id}"
        logger.info(f"Using topic ID: {topic_id}")
        logger.debug(f"Generated topic ARN: {topic_arn}")
        
        # Generate embed URL
        logger.info("Generating embed URL for anonymous user")
        logger.debug(f"Session lifetime: 600 minutes, Allowed domains: {['http://localhost:4200', 'https://yourdomain.com']}")
        
        response = quicksight.generate_embed_url_for_anonymous_user(
            AwsAccountId=account_id,
            Namespace=namespace,
            SessionLifetimeInMinutes=600,
            AuthorizedResourceArns=[topic_arn],
            ExperienceConfiguration={
                "QSearchBar": {
                    "InitialTopicId": topic_id
                }
            },
            AllowedDomains=[
                "http://localhost:4200",
                "https://yourdomain.com"
            ]
        )
        
        logger.info("Successfully generated embed URL")
        logger.debug(f"Response keys: {list(response.keys())}")
        
        execution_time = time.time() - start_time
        logger.info(f"Standalone function completed successfully in {execution_time:.2f} seconds")
        
        result = {
            "EmbedUrl": response["EmbedUrl"],
            "TopicId": topic_id,
            "TopicArn": topic_arn
        }
        
        logger.debug(f"Returning result: {json.dumps(result, default=str)}")
        return result
        
    except Exception as e:
        execution_time = time.time() - start_time
        logger.error(f"Standalone function failed after {execution_time:.2f} seconds: {e}", exc_info=True)
        raise


