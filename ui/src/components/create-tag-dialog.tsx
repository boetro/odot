import { Button } from "./ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "./ui/dialog";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { tagMutations } from "@/lib/queries/tags";
import type { Tag } from "@/lib/types";
import { Label } from "./ui/label";

const COLOR_PALETTE = [
	{ name: "Red", hex: "#ef4444" },
	{ name: "Orange", hex: "#f97316" },
	{ name: "Amber", hex: "#f59e0b" },
	{ name: "Yellow", hex: "#eab308" },
	{ name: "Lime", hex: "#84cc16" },
	{ name: "Green", hex: "#22c55e" },
	{ name: "Emerald", hex: "#10b981" },
	{ name: "Teal", hex: "#14b8a6" },
	{ name: "Cyan", hex: "#06b6d4" },
	{ name: "Sky", hex: "#0ea5e9" },
	{ name: "Blue", hex: "#3b82f6" },
	{ name: "Indigo", hex: "#6366f1" },
	{ name: "Violet", hex: "#8b5cf6" },
	{ name: "Purple", hex: "#a855f7" },
	{ name: "Fuchsia", hex: "#d946ef" },
	{ name: "Pink", hex: "#ec4899" },
	{ name: "Rose", hex: "#f43f5e" },
];

export function CreateTagDialog({
	open,
	onOpenChange,
	existingTag,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	existingTag?: Tag | null;
}) {
	const queryClient = useQueryClient();
	const nameInputRef = useRef<HTMLInputElement>(null);

	const [pendingTag, setPendingTag] = useState<{
		name: string;
		color: string;
	}>(() => {
		if (existingTag) {
			return {
				name: existingTag.name,
				color: existingTag.color,
			};
		}
		return {
			name: "",
			color: COLOR_PALETTE[0].hex,
		};
	});

	const [error, setError] = useState<string | null>(null);

	const createMutation = useMutation(tagMutations.createTag(queryClient));
	const updateMutation = useMutation(tagMutations.updateTag(queryClient));

	useEffect(() => {
		if (nameInputRef.current) {
			nameInputRef.current.focus();
		}
	}, []);

	function resetForm() {
		if (existingTag) {
			setPendingTag({
				name: existingTag.name,
				color: existingTag.color,
			});
		} else {
			setPendingTag({
				name: "",
				color: COLOR_PALETTE[0].hex,
			});
		}
		setError(null);
	}

	function handleSubmit() {
		if (!pendingTag.name) {
			setError("Name is required");
			return;
		}

		if (pendingTag.name.length < 1) {
			setError("Name must be at least 1 character");
			return;
		}

		if (pendingTag.name.length > 100) {
			setError("Name must be less than 100 characters");
			return;
		}

		setError(null);

		const tagData = {
			name: pendingTag.name,
			color: pendingTag.color,
		};

		if (existingTag) {
			updateMutation.mutate(
				{ id: existingTag.id, ...tagData },
				{
					onSuccess: () => {
						resetForm();
						onOpenChange(false);
					},
				},
			);
		} else {
			createMutation.mutate(tagData, {
				onSuccess: () => {
					resetForm();
					onOpenChange(false);
				},
			});
		}
	}

	return (
		<Dialog
			open={open}
			onOpenChange={(open) => {
				resetForm();
				onOpenChange(open);
			}}
		>
			<DialogContent
				className="sm:max-w-md p-0 pt-4 top-[25%] md:top-[50%]"
				showCloseButton={false}
				aria-describedby="Create Tag Dialog"
			>
				<DialogHeader className="px-4">
					<DialogTitle>
						<input
							type="text"
							placeholder={existingTag ? "Edit Tag Name" : "Tag Name"}
							data-slot="input"
							ref={nameInputRef}
							className="outline-none w-full"
							value={pendingTag.name}
							onChange={(e) =>
								setPendingTag({
									...pendingTag,
									name: e.target.value,
								})
							}
						/>
					</DialogTitle>
				</DialogHeader>
				<div className="flex space-y-4 flex-col px-4">
					<div className="space-y-2">
						<Label>Color</Label>
						<div className="grid grid-cols-9 gap-2">
							{COLOR_PALETTE.map((c) => (
								<button
									key={c.hex}
									type="button"
									className={`w-8 h-8 rounded border-2 transition-all ${pendingTag.color === c.hex
										? "border-foreground scale-110"
										: "border-transparent hover:scale-105"
										}`}
									style={{ backgroundColor: c.hex }}
									onClick={() => setPendingTag({ ...pendingTag, color: c.hex })}
								/>
							))}
						</div>
					</div>
					{error && <p className="text-red-500 text-sm">{error}</p>}
				</div>
				<DialogFooter className="border-t py-2">
					<div className="flex justify-between px-4 w-full">
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() => {
								resetForm();
								onOpenChange(false);
							}}
						>
							Cancel
						</Button>
						<Button
							type="submit"
							size="sm"
							disabled={
								!pendingTag.name ||
								createMutation.isPending ||
								updateMutation.isPending
							}
							onClick={handleSubmit}
						>
							{existingTag
								? updateMutation.isPending
									? "Updating..."
									: "Update"
								: createMutation.isPending
									? "Creating..."
									: "Create"}
						</Button>
					</div>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
