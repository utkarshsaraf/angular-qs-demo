import json
import boto3
import os

quicksight = boto3.client("quicksight")

def lambda_handler(event, context):
    account_id = os.environ["ACCOUNT_ID"]
    region = os.environ.get("AWS_REGION", "us-east-1")
    namespace = "default"   # change if you have custom namespace

    # Step 1: List topics
    topics = quicksight.list_topics(AwsAccountId=account_id)
    if not topics.get("Topics"):
        return {"statusCode": 500, "body": "No topics found in QuickSight."}

    # Pick the first published topic (you can filter here if you want a specific one)
    topic = None
    for t in topics["Topics"]:
        if t.get("TopicId") and t.get("Status") == "PUBLISHED":
            topic = t
            break
    
    if not topic:
        return {"statusCode": 500, "body": "No published topics found."}

    topic_id = topic["TopicId"]
    topic_arn = f"arn:aws:quicksight:{region}:{account_id}:topic/{topic_id}"

    # Step 2: Generate embed URL
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
    except Exception as e:
        return {"statusCode": 500, "body": str(e)}

    # Step 3: Return URL
    return {
        "statusCode": 200,
        "body": json.dumps({
            "EmbedUrl": response["EmbedUrl"],
            "TopicId": topic_id,
            "TopicArn": topic_arn
        })
    }

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
    if account_id is None:
        account_id = os.environ.get("ACCOUNT_ID")
        if not account_id:
            raise ValueError("ACCOUNT_ID environment variable not set")
    
    if region is None:
        region = os.environ.get("AWS_REGION", "us-east-1")
    
    namespace = "default"
    
    # List topics
    topics = quicksight.list_topics(AwsAccountId=account_id)
    if not topics.get("Topics"):
        raise Exception("No topics found in QuickSight")
    
    # Pick the first published topic
    topic = None
    for t in topics["Topics"]:
        if t.get("TopicId") and t.get("Status") == "PUBLISHED":
            topic = t
            break
    
    if not topic:
        raise Exception("No published topics found")
    
    topic_id = topic["TopicId"]
    topic_arn = f"arn:aws:quicksight:{region}:{account_id}:topic/{topic_id}"
    
    # Generate embed URL
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
    
    return {
        "EmbedUrl": response["EmbedUrl"],
        "TopicId": topic_id,
        "TopicArn": topic_arn
    }

if __name__ == "__main__":
    # Example usage for standalone execution
    try:
        result = generate_quicksight_embed_url()
        print("Successfully generated embed URL:")
        print(json.dumps(result, indent=2))
    except Exception as e:
        print(f"Error: {e}")
