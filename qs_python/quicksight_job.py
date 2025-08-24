import json
import boto3
import os

# Configuration constants
DEFAULT_REGION = "us-east-1"
ACCOUNT_ID = os.environ.get("ACCOUNT_ID")

def lambda_handler(event, context):
    try:
        # Validate global account_id
        if not ACCOUNT_ID:
            return {
                "statusCode": 400,
                "body": "ACCOUNT_ID environment variable not set"
            }
        
        # Get region from environment
        region = os.environ.get("AWS_REGION", DEFAULT_REGION)
        
        # Create QuickSight client
        quicksight = boto3.client("quicksight", region_name=region)
        
        # List topics
        topics = quicksight.list_topics(AwsAccountId=ACCOUNT_ID)
        all_topics = topics.get('Topics', [])
        
        # Process and categorize topics
        published_topics = []
        draft_topics = []
        other_topics = []
        
        for topic in all_topics:
            topic_status = topic.get('Status', 'Unknown')
            if topic_status == "PUBLISHED":
                published_topics.append(topic)
            elif topic_status == "DRAFT":
                draft_topics.append(topic)
            else:
                other_topics.append(topic)
        
        result = {
            "TotalTopics": len(all_topics),
            "PublishedTopics": len(published_topics),
            "DraftTopics": len(draft_topics),
            "OtherTopics": len(other_topics),
            "Topics": all_topics,
            "Region": region,
            "AccountId": ACCOUNT_ID
        }
        
        return {
            "statusCode": 200,
            "body": json.dumps(result)
        }
        
    except Exception as e:
        return {
            "statusCode": 500, 
            "body": f"Internal server error: {str(e)}"
        }

# Example usage for standalone execution
if __name__ == "__main__":
    try:
        # Simulate Lambda context for standalone testing
        class MockContext:
            pass
        
        context = MockContext()
        event = {}
        
        result = lambda_handler(event, context)
        print(f"Status Code: {result['statusCode']}")
        print(f"Response: {result['body']}")
        
    except Exception as e:
        print(f"Error: {e}")
        print("Make sure you have AWS credentials configured and ACCOUNT_ID environment variable is set")


