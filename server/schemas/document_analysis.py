from pydantic import BaseModel, Field


class AnalysisSection(BaseModel):
    heading: str
    body: str


class DocumentAnalysisOutput(BaseModel):
    title: str
    text_page: AnalysisSection = Field(description="Main document text for the reader view")
    further_research: AnalysisSection = Field(description="Suggested topics for deeper study")
    short_explanation: str = Field(description="Brief summary of the document")


class AnalyzeDocumentResponse(BaseModel):
    status: str = "success"
    file_url: str
    result_url: str
    title: str
    output: DocumentAnalysisOutput
