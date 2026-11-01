from setuptools import setup, find_packages

setup(
    name="yoyo-ai",
    version="1.0.0",
    description="Official Python Client for the YOYO Cloud AI Model API Platform",
    long_description=open("README.md").read(),
    long_description_content_type="text/markdown",
    author="YOYO AI Platform Team",
    author_email="engineering@yoyo.ai",
    url="https://yoyo.ai",
    packages=find_packages(),
    py_modules=["yoyo"],
    python_requires=">=3.8",
    classifiers=[
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
    ],
)

