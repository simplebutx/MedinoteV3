from io import BytesIO

from PIL import Image, ImageEnhance, ImageOps

MAX_IMAGE_SIZE = 1800
CONTRAST_FACTOR = 1.25
SHARPNESS_FACTOR = 1.35
JPEG_QUALITY = 92


def preprocess_image_for_ocr(image_bytes: bytes) -> bytes:
    image = Image.open(BytesIO(image_bytes))
    image = ImageOps.exif_transpose(image)
    image = image.convert("RGB")

    image.thumbnail((MAX_IMAGE_SIZE, MAX_IMAGE_SIZE))

    image = ImageEnhance.Contrast(image).enhance(CONTRAST_FACTOR)
    image = ImageEnhance.Sharpness(image).enhance(SHARPNESS_FACTOR)

    output = BytesIO()
    image.save(output, format="JPEG", quality=JPEG_QUALITY, optimize=True)

    return output.getvalue()
