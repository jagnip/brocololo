"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import type { UserResource } from "@clerk/types";
import { LogOut, UserCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useSidebar } from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ROUTES } from "@/lib/constants";
import { cn } from "@/lib/utils";

function getUserInitials(user: UserResource): string {
  if (user.firstName && user.lastName) {
    return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
  }
  if (user.firstName) {
    return user.firstName[0].toUpperCase();
  }
  const email = user.primaryEmailAddress?.emailAddress;
  if (email) {
    return email[0].toUpperCase();
  }
  return "?";
}

export function SidebarUserMenu() {
  const { user, isLoaded } = useUser();
  const clerk = useClerk();
  const { state, isMobile } = useSidebar();

  const email = user?.primaryEmailAddress?.emailAddress ?? "";

  if (!isLoaded) {
    return (
      <div className="flex items-center gap-2 rounded-md px-2 py-2.5 group-data-[collapsible=icon]:justify-center">
        <Skeleton className="size-8 shrink-0 rounded-full" />
        <Skeleton className="h-4 flex-1 rounded-sm group-data-[collapsible=icon]:hidden" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                "flex w-full items-center gap-2 overflow-hidden rounded-md px-2 py-2.5 text-left text-sm font-medium text-muted-foreground outline-hidden ring-sidebar-ring transition-[width,height,padding,colors] hover:bg-muted hover:text-primary focus-visible:ring-2",
                "group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:p-2",
              )}
              aria-label={`Account menu for ${email}`}
            >
              <Avatar className="size-8 shrink-0">
                <AvatarImage src={user.imageUrl} alt="" />
                <AvatarFallback>{getUserInitials(user)}</AvatarFallback>
              </Avatar>
              <span className="min-w-0 flex-1 truncate group-data-[collapsible=icon]:hidden">
                {email}
              </span>
            </button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent
          side="right"
          align="center"
          hidden={state !== "collapsed" || isMobile}
        >
          {email}
        </TooltipContent>
      </Tooltip>

      <DropdownMenuContent side="right" align="end" className="w-56">
        <DropdownMenuLabel className="truncate font-normal">
          {email}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => clerk.openUserProfile()}>
          <UserCircle />
          Manage account
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => void clerk.signOut({ redirectUrl: ROUTES.signIn })}
        >
          <LogOut />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
