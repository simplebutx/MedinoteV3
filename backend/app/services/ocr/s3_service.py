import uuid
import boto3
import os

AWS_REGION = os.getenv("AWS_REGION", "ap-northeast-2")
BUCKET_NAME = os.getenv("AWS_S3_BUCKET", "ocr-images")

s3_client = boto3.client(
    "s3",
    region_name=AWS_REGION,
)

def create_presigned_upload_url():
    object_key = f"medinotev2/{uuid.uuid4()}.jpg"
    upload_url = s3_client.generate_presigned_url(
        ClientMethod='put_object',
        Params={
            "Bucket": BUCKET_NAME,
            "Key": object_key,
            "ContentType": "image/jpeg",
        },
        ExpiresIn=600,
    )

    return object_key, upload_url

# s3에서 이미지 가져오기
def get_object_bytes(object_key: str) -> bytes:
    response = s3_client.get_object(
        Bucket=BUCKET_NAME,
        Key=object_key,
    )

    return response["Body"].read()
