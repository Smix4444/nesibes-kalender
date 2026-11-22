"use client";

import { useState, useTransition } from "react";
import { Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { placeBid } from "@/lib/actions/appointments";
import { COIN_EMOJI, COIN_NAME_PLURAL } from "@/lib/config";

export function BidSheet({
  auctionId,
  current,
  sweetener,
  balance,
}: {
  auctionId: string;
  current: number;
  sweetener: string | null;
  balance: number;
}) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(current);
  const [extra, setExtra] = useState(sweetener ?? "");
  const [pending, startTransition] = useTransition();

  // Je huidige bod staat al vast, dus dat telt mee als budget.
  const max = balance + current;

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger
        render={
          <Button className="h-12 w-full text-base font-bold">
            {current > 0 ? `Verhoog bod (nu ${current})` : "Doe een bod"} {COIN_EMOJI}
          </Button>
        }
      />
      <DrawerContent>
        <div className="mx-auto w-full max-w-md">
          <DrawerHeader>
            <DrawerTitle className="font-heading">Hoeveel çiğköftes?</DrawerTitle>
            <DrawerDescription>
              Je hebt er {max} te besteden. Verlies je, dan krijg je alles terug.
            </DrawerDescription>
          </DrawerHeader>

          <div className="space-y-5 px-4">
            <div className="flex items-center justify-center gap-6">
              <Button
                variant="outline"
                size="icon-lg"
                className="size-14 rounded-full"
                aria-label="Eén minder"
                disabled={amount <= 0}
                onClick={() => setAmount((a) => Math.max(0, a - 1))}
              >
                <Minus className="size-5" />
              </Button>

              <p className="font-heading text-5xl font-extrabold tabular-nums">{amount}</p>

              <Button
                variant="outline"
                size="icon-lg"
                className="size-14 rounded-full"
                aria-label="Eén meer"
                disabled={amount >= max}
                onClick={() => setAmount((a) => Math.min(max, a + 1))}
              >
                <Plus className="size-5" />
              </Button>
            </div>
            <p className="text-center text-xs text-muted-foreground">
              {COIN_EMOJI} van je {max} {COIN_NAME_PLURAL}
            </p>

            <div className="space-y-1.5">
              <Label htmlFor="sweetener">Extra verleiding (optioneel)</Label>
              <Input
                id="sweetener"
                value={extra}
                maxLength={100}
                placeholder="ik trakteer bubble tea 🧋"
                onChange={(e) => setExtra(e.target.value)}
                className="h-11"
              />
            </div>
          </div>

          <DrawerFooter>
            <Button
              className="h-12 font-bold"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await placeBid(auctionId, amount, extra);
                  if (result.ok) {
                    toast.success("Bod geplaatst 🌶️");
                    setOpen(false);
                  } else toast.error(result.error);
                })
              }
            >
              {pending ? "Bieden…" : `Bied ${amount} ${COIN_EMOJI}`}
            </Button>
            <DrawerClose render={<Button variant="ghost" className="h-11">Annuleren</Button>} />
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
