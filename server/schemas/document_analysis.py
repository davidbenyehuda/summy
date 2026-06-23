from pydantic import BaseModel, Field


class AnalysisSection(BaseModel):
    heading: str
    body: str


class QuizQuestion(BaseModel):
    question: str
    options: list[str] = Field(min_length=4, max_length=4)
    correct: int = Field(ge=0, le=3, description="0-based index of the correct option")


class ResearchItem(BaseModel):
    title: str
    text: str = Field(description="Detailed Hebrew explanation of what to learn and why it matters")
    url: str = Field(default="", description="Source URL")
    concept: str = Field(default="", description="Key concept or topic the student should explore")
    is_new: bool = Field(default=False, description="True when added after a chat follow-up")


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
