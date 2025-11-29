import { Tags, Plus } from "lucide-react";
import { SmallButton } from "./small-button";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Checkbox } from "./ui/checkbox";
import { TagBadge } from "./tag-badge";
import type { Tag } from "@/lib/types";
import { useState } from "react";
import { Button } from "./ui/button";
import { CreateTagDialog } from "./create-tag-dialog";

export function TagSelector({
	tags,
	selectedTagIds,
	onTagsChange,
	variant = "small",
}: {
	tags: Tag[];
	selectedTagIds: number[];
	onTagsChange: (tagIds: number[]) => void;
	variant?: "small" | "large";
}) {
	const [open, setOpen] = useState(false);
	const [showCreateDialog, setShowCreateDialog] = useState(false);

	const selectedTags = tags.filter((t) => selectedTagIds.includes(t.id));

	const toggleTag = (tagId: number) => {
		if (selectedTagIds.includes(tagId)) {
			onTagsChange(selectedTagIds.filter((id) => id !== tagId));
		} else {
			onTagsChange([...selectedTagIds, tagId]);
		}
	};

	return (
		<>
			<Popover open={open} onOpenChange={setOpen} modal={true}>
				<PopoverTrigger asChild>
					{variant === "small" ? (
						<SmallButton>
							<Tags className="size-4" />
							<span>
								{selectedTags.length > 0
									? `${selectedTags.length} tag${selectedTags.length > 1 ? "s" : ""}`
									: "Tags"}
							</span>
						</SmallButton>
					) : (
						<button className="flex flex-row gap-4 items-center hover:bg-muted rounded-md p-1">
							<Tags className="size-4" />
							<span>
								{selectedTags.length > 0
									? `${selectedTags.length} tag${selectedTags.length > 1 ? "s" : ""}`
									: "Add tags"}
							</span>
						</button>
					)}
				</PopoverTrigger>
				<PopoverContent className="w-64 p-2" align="start">
					<div className="flex flex-col space-y-1 max-h-60 overflow-y-auto">
						{tags.length === 0 ? (
							<div className="text-center text-sm text-muted-foreground">
								No tags yet. Create one below!
							</div>
						) : (
							tags.map((tag) => (
								<button
									key={tag.id}
									className="flex items-center gap-2 p-2 text-sm hover:bg-accent rounded-sm"
									onClick={() => toggleTag(tag.id)}
								>
									<Checkbox checked={selectedTagIds.includes(tag.id)} />
									<TagBadge tag={tag} size="sm" />
								</button>
							))
						)}
						<Button
							variant="ghost"
							size="sm"
							className="justify-start mt-2"
							onClick={() => {
								setShowCreateDialog(true);
								setOpen(false);
							}}
						>
							<Plus className="size-4 mr-2" />
							Create new tag
						</Button>
					</div>
				</PopoverContent>
			</Popover>

			<CreateTagDialog
				open={showCreateDialog}
				onOpenChange={setShowCreateDialog}
			/>
		</>
	);
}
