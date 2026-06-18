from pydantic import BaseModel
from typing import List, Optional


class AuthorOut(BaseModel):
    id: str
    full_name: str
    avatar_url: Optional[str]
    institution: Optional[str]
    model_config = {"from_attributes": True}


class CommentCreate(BaseModel):
    content: str


class CommentOut(BaseModel):
    id: str
    content: str
    author: AuthorOut
    created_at: str
    model_config = {"from_attributes": True}


class ForumCreate(BaseModel):
    title: str
    description: Optional[str] = None
    category: Optional[str] = None


class ForumOut(BaseModel):
    id: str
    title: str
    description: Optional[str]
    category: Optional[str]
    post_count: int = 0
    model_config = {"from_attributes": True}


class PostCreate(BaseModel):
    title: str
    content: str


class PostUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None


class PostListItem(BaseModel):
    id: str
    title: str
    content: str
    is_pinned: bool
    is_announcement: bool
    view_count: int
    author: AuthorOut
    comment_count: int = 0
    created_at: str
    model_config = {"from_attributes": True}


class PostDetail(PostListItem):
    comments: List[CommentOut] = []


class PaginatedPosts(BaseModel):
    items: List[PostListItem]
    total: int
    page: int
    pages: int
