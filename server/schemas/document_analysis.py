from pydantic import BaseModel, Field


class AnalysisSection(BaseModel):
    heading: str
    body: str


class QuizQuestion(BaseModel):
    question: str


class ResearchItem(BaseModel):
    title: str
    text: str = Field(description="Brief Hebrew explanation of what the source covers")
    url: str = Field(description="Source URL")


class FurtherResearch(BaseModel):
    heading: str = "מחקר נוסף"
    items: list[ResearchItem] = Field(default_factory=list)


class DocumentAnalysisOutput(BaseModel):
    title: str
    text_page: AnalysisSection = Field(description="Main document text for the reader view")
    further_research: FurtherResearch = Field(description="Web research sources for deeper study")
    short_explanation: str = Field(description="Brief summary of the document")
    quiz: list[QuizQuestion] = Field(default_factory=list, description="Comprehension questions")


class AnalyzeDocumentResponse(BaseModel):
    status: str = "success"
    file_url: str
    result_url: str
    title: str
    output: DocumentAnalysisOutput
