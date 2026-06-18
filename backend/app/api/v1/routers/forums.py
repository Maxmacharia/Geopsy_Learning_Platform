from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from math import ceil
from typing import Optional
import bleach

from app.core.dependencies import get_db, get_current_user, require_admin
from app.models.user import User
from app.models.forum import Forum, ForumPost, Comment
from app.schemas.forum import (
    ForumCreate, ForumOut, PostCreate, PostUpdate,
    PostListItem, PostDetail, CommentCreate, CommentOut,
    AuthorOut, PaginatedPosts,
)

router = APIRouter(prefix="/forums", tags=["forums"])

ALLOWED_TAGS = ["b", "i", "u", "em", "strong", "p", "br", "ul", "ol", "li", "a", "code", "pre"]


def sanitize(text: str) -> str:
    return bleach.clean(text, tags=ALLOWED_TAGS, strip=True)


def author_out(user: User) -> AuthorOut:
    return AuthorOut(id=user.id, full_name=user.full_name, avatar_url=user.avatar_url, institution=user.institution)


def post_to_list(p: ForumPost) -> PostListItem:
    return PostListItem(
        id=p.id, title=p.title, content=p.content,
        is_pinned=p.is_pinned, is_announcement=p.is_announcement,
        view_count=p.view_count, author=author_out(p.author),
        comment_count=len(p.comments), created_at=p.created_at.isoformat(),
    )


@router.get("", response_model=list[ForumOut])
def list_forums(db: Session = Depends(get_db)):
    forums = db.query(Forum).all()
    return [ForumOut(id=f.id, title=f.title, description=f.description, category=f.category, post_count=len(f.posts)) for f in forums]


@router.post("", response_model=ForumOut, status_code=201)
def create_forum(body: ForumCreate, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    forum = Forum(**body.model_dump())
    db.add(forum)
    db.commit()
    db.refresh(forum)
    return ForumOut(id=forum.id, title=forum.title, description=forum.description, category=forum.category, post_count=0)


@router.get("/{forum_id}/posts", response_model=PaginatedPosts)
def list_posts(
    forum_id: str,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
    search: Optional[str] = None,
    db: Session = Depends(get_db),
):
    forum = db.query(Forum).filter(Forum.id == forum_id).first()
    if not forum:
        raise HTTPException(404, "Forum not found")

    q = db.query(ForumPost).filter(ForumPost.forum_id == forum_id)
    if search:
        q = q.filter(ForumPost.title.ilike(f"%{search}%") | ForumPost.content.ilike(f"%{search}%"))

    total = q.count()
    posts = q.order_by(ForumPost.is_pinned.desc(), ForumPost.created_at.desc()).offset((page - 1) * limit).limit(limit).all()
    return PaginatedPosts(
        items=[post_to_list(p) for p in posts],
        total=total, page=page, pages=ceil(total / limit) if total else 1,
    )


@router.post("/{forum_id}/posts", response_model=PostListItem, status_code=201)
def create_post(forum_id: str, body: PostCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    forum = db.query(Forum).filter(Forum.id == forum_id).first()
    if not forum:
        raise HTTPException(404, "Forum not found")
    post = ForumPost(
        forum_id=forum_id, author_id=current_user.id,
        title=sanitize(body.title), content=sanitize(body.content),
    )
    db.add(post)
    db.commit()
    db.refresh(post)
    return post_to_list(post)


@router.get("/posts/{post_id}", response_model=PostDetail)
def get_post(post_id: str, db: Session = Depends(get_db)):
    post = db.query(ForumPost).filter(ForumPost.id == post_id).first()
    if not post:
        raise HTTPException(404, "Post not found")
    post.view_count += 1
    db.commit()
    comments = [CommentOut(
        id=c.id, content=c.content,
        author=author_out(c.author), created_at=c.created_at.isoformat(),
    ) for c in post.comments]
    return PostDetail(**post_to_list(post).model_dump(), comments=comments)


@router.post("/posts/{post_id}/comments", response_model=CommentOut, status_code=201)
def add_comment(post_id: str, body: CommentCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    post = db.query(ForumPost).filter(ForumPost.id == post_id).first()
    if not post:
        raise HTTPException(404, "Post not found")
    comment = Comment(post_id=post_id, author_id=current_user.id, content=sanitize(body.content))
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return CommentOut(id=comment.id, content=comment.content, author=author_out(current_user), created_at=comment.created_at.isoformat())


@router.patch("/posts/{post_id}/pin", status_code=200)
def pin_post(post_id: str, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    post = db.query(ForumPost).filter(ForumPost.id == post_id).first()
    if not post:
        raise HTTPException(404, "Post not found")
    post.is_pinned = not post.is_pinned
    db.commit()
    return {"is_pinned": post.is_pinned}


@router.delete("/posts/{post_id}", status_code=204)
def delete_post(post_id: str, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    post = db.query(ForumPost).filter(ForumPost.id == post_id).first()
    if not post:
        raise HTTPException(404, "Post not found")
    db.delete(post)
    db.commit()


@router.delete("/comments/{comment_id}", status_code=204)
def delete_comment(comment_id: str, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    comment = db.query(Comment).filter(Comment.id == comment_id).first()
    if not comment:
        raise HTTPException(404, "Comment not found")
    db.delete(comment)
    db.commit()
