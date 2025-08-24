import json
import boto3
import os
import time

"""
AWS Lambda QuickSight Job with simple print logging

This module provides simple logging using print statements for AWS Lambda execution.
AWS Lambda automatically sends stdout/stderr to CloudWatch for monitoring.
"""

# Initialize AWS client
print("Initializing AWS QuickSight client")
try:
    quicksight = boto3.client("quicksight")
    print("Successfully initialized QuickSight client")
except Exception as e:
    print(f"Failed to initialize QuickSight client: {e}")
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
    
    # Lambda execution started
    print(f"Lambda execution started - Request ID: {request_id}, Function: {function_name}, Version: {function_version}")
    print(f"Event type: {type(event).__name__}, Event size: {len(json.dumps(event, default=str))} bytes")
    
    try:
        # Extract environment variables
        print("Extracting environment variables")
        account_id = os.environ["ACCOUNT_ID"]
        region = os.environ.get("AWS_REGION", "us-east-2")
        namespace = "default"   # change if you have custom namespace
        
        # Lambda environment configured
        print(f"Lambda environment configured - Account: {account_id}, Region: {region}, Namespace: {namespace}")
        print(f"Function: {function_name}, Version: {function_version}")
        
        # Step 1: List topics
        print("Step 1: Listing QuickSight topics")
        print(f"Calling list_topics for account: {account_id}")
        
        topics = quicksight.list_topics(AwsAccountId=account_id)
        print(f"Successfully retrieved {len(topics.get('Topics', []))} topics")
        
        if not topics.get("Topics"):
            print("No topics found in QuickSight account")
            return {"statusCode": 500, "body": "No topics found in QuickSight."}

        # Pick the first published topic (you can filter here if you want a specific one)
        print("Searching for published topics")
        topic = None
        published_topics = []
        
        for t in topics["Topics"]:
            print(f"Examining topic: {t.get('TopicId')} - Status: {t.get('Status')}")
            if t.get("TopicId") and t.get("Status") == "PUBLISHED":
                published_topics.append(t)
                if topic is None:  # Pick the first one
                    topic = t
                    print(f"Selected topic: {t.get('TopicId')} - Name: {t.get('Name', 'Unknown')}")
        
        print(f"Found {len(published_topics)} published topics out of {len(topics['Topics'])} total topics")
        
        if not topic:
            print("No published topics found in QuickSight account")
            return {"statusCode": 500, "body": "No published topics found."}

        topic_id = topic["TopicId"]
        topic_arn = f"arn:aws:quicksight:{region}:{account_id}:topic/{topic_id}"
        print(f"Using topic ID: {topic_id}")
        print(f"Generated topic ARN: {topic_arn}")

        # Step 2: Generate embed URL
        print("Step 2: Generating embed URL for anonymous user")
        print(f"Session lifetime: 600 minutes, Allowed domains: {['http://localhost:4200', 'https://yourdomain.com']}")
        
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
            print("Successfully generated embed URL")
            print(f"Response keys: {list(response.keys())}")
            
        except Exception as e:
            print(f"Failed to generate embed URL: {e}")
            return {"statusCode": 500, "body": str(e)}

        # Step 3: Return URL
        execution_time = time.time() - start_time
        memory_used = getattr(context, 'memory_limit_in_mb', 'unknown') if context else 'unknown'
        
        # Lambda success metrics
        print(f"Lambda execution completed successfully")
        print(f"Request ID: {request_id}, Execution time: {round(execution_time * 1000, 2)}ms")
        print(f"Memory used: {memory_used}MB, Topics found: {len(topics.get('Topics', []))}")
        print(f"Published topics: {len(published_topics)}")
        
        result = {
            "statusCode": 200,
            "body": json.dumps({
                "EmbedUrl": response["EmbedUrl"],
                "TopicId": topic_id,
                "TopicArn": topic_arn
            })
        }
        
        print(f"Returning result: {json.dumps(result, default=str)}")
        return result
        
    except Exception as e:
        execution_time = time.time() - start_time
        memory_used = getattr(context, 'memory_limit_in_mb', 'unknown') if context else 'unknown'
        
        # Lambda error metrics
        print(f"Lambda execution failed")
        print(f"Request ID: {request_id}, Execution time: {round(execution_time * 1000, 2)}ms")
        print(f"Memory used: {memory_used}MB, Error type: {type(e).__name__}")
        print(f"Error message: {str(e)}")
        
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
    print("Starting standalone QuickSight embed URL generation")
    
    try:
        # Validate and set parameters
        if account_id is None:
            print("Account ID not provided, checking environment variable")
            account_id = os.environ.get("ACCOUNT_ID")
            if not account_id:
                print("ACCOUNT_ID environment variable not set")
                raise ValueError("ACCOUNT_ID environment variable not set")
            print(f"Using ACCOUNT_ID from environment: {account_id}")
        else:
            print(f"Using provided account ID: {account_id}")
        
        if region is None:
            print("Region not provided, checking environment variable")
            region = os.environ.get("AWS_REGION", "us-east-1")
            print(f"Using region from environment: {region}")
        else:
            print(f"Using provided region: {region}")
        
        namespace = "default"
        print(f"Using namespace: {namespace}")
        
        # List topics
        print("Listing QuickSight topics")
        print(f"Calling list_topics for account: {account_id}")
        
        topics = quicksight.list_topics(AwsAccountId=account_id)
        print(f"Successfully retrieved {len(topics.get('Topics', []))} topics")
        
        if not topics.get("Topics"):
            print("No topics found in QuickSight account")
            raise Exception("No topics found in QuickSight")
        
        # Pick the first published topic
        print("Searching for published topics")
        topic = None
        published_topics = []
        
        for t in topics["Topics"]:
            print(f"Examining topic: {t.get('TopicId')} - Status: {t.get('Status')} - Name: {t.get('Name', 'Unknown')}")
            if t.get("TopicId") and t.get("Status") == "PUBLISHED":
                published_topics.append(t)
                if topic is None:  # Pick the first one
                    topic = t
                    print(f"Selected topic: {t.get('TopicId')} - Name: {t.get('Name', 'Unknown')}")
        
        print(f"Found {len(published_topics)} published topics out of {len(topics['Topics'])} total topics")
        
        if not topic:
            print("No published topics found in QuickSight account")
            raise Exception("No published topics found")
        
        topic_id = topic["TopicId"]
        topic_arn = f"arn:aws:quicksight:{region}:{account_id}:topic/{topic_id}"
        print(f"Using topic ID: {topic_id}")
        print(f"Generated topic ARN: {topic_arn}")
        
        # Generate embed URL
        print("Generating embed URL for anonymous user")
        print(f"Session lifetime: 600 minutes, Allowed domains: {['http://localhost:4200', 'https://yourdomain.com']}")
        
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
        
        print("Successfully generated embed URL")
        print(f"Response keys: {list(response.keys())}")
        
        execution_time = time.time() - start_time
        print(f"Standalone function completed successfully in {execution_time:.2f} seconds")
        
        result = {
            "EmbedUrl": response["EmbedUrl"],
            "TopicId": topic_id,
            "TopicArn": topic_arn
        }
        
        print(f"Returning result: {json.dumps(result, default=str)}")
        return result
        
    except Exception as e:
        execution_time = time.time() - start_time
        print(f"Standalone function failed after {execution_time:.2f} seconds: {e}")
        raise


