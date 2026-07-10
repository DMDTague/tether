"""Explicit controls for aesthetic identity and the opt-in Dating world."""

from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field, field_validator

from routes.auth import get_current_user_id
from services.profile_signal import profile_signal_store

router = APIRouter(prefix="/api/profile-signal", tags=["profile-signal"])


class Atmosphere(BaseModel):
    statement: str = Field(default="", max_length=240)
    palette: list[str] = Field(default_factory=list, max_length=5)
    motion: Literal["liquid-signal", "aura", "waves", "still"] = "liquid-signal"
    topFive: list[str] = Field(default_factory=list, max_length=5)

    @field_validator("palette")
    @classmethod
    def valid_palette(cls, values: list[str]) -> list[str]:
        for value in values:
            if len(value) != 7 or not value.startswith("#"):
                raise ValueError("Palette colors must use six-digit hex notation")
            int(value[1:], 16)
        return values


class DatingSignal(BaseModel):
    enabled: bool = False
    visible: bool = False
    identity: str = Field(default="", max_length=40)
    orientation: str = Field(default="", max_length=40)
    intent: str = Field(default="Open to the signal", max_length=60)
    height: str = Field(default="", max_length=20)
    bodyDescription: str = Field(default="", max_length=80)
    priorityArtist: str = Field(default="", max_length=100)
    dealbreakerArtist: str = Field(default="", max_length=100)
    prompt: str = Field(default="", max_length=180)

    @field_validator("visible")
    @classmethod
    def visibility_requires_opt_in(cls, visible: bool, info):
        if visible and not info.data.get("enabled"):
            raise ValueError("Dating visibility requires dating to be enabled")
        return visible


class ProfileSignalUpdate(BaseModel):
    atmosphere: Atmosphere
    dating: DatingSignal


@router.get("/me")
async def get_my_profile_signal(user_id: str = Depends(get_current_user_id)):
    return await profile_signal_store.get_profile(user_id)


@router.patch("/me")
async def update_my_profile_signal(update: ProfileSignalUpdate, user_id: str = Depends(get_current_user_id)):
    return await profile_signal_store.set_profile(user_id, update.model_dump())


@router.delete("/me/dating", status_code=204)
async def disable_my_dating_signal(user_id: str = Depends(get_current_user_id)):
    profile = await profile_signal_store.get_profile(user_id)
    profile["dating"]["enabled"] = False
    profile["dating"]["visible"] = False
    await profile_signal_store.set_profile(user_id, profile)
    return None


@router.get("/{profile_user_id}")
async def get_public_profile_signal(profile_user_id: str, user_id: str = Depends(get_current_user_id)):
    del user_id
    return await profile_signal_store.public_profile(profile_user_id, include_dating=False)
