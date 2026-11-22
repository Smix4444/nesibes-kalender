import { Button } from "@/components/ui/button";

/** Open de locatie in de kaart-app die iemand al gebruikt. */
export function RouteButtons({ lat, lng }: { lat: number; lng: number }) {
  const links = [
    { label: "Google Maps", href: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}` },
    { label: "Waze", href: `https://waze.com/ul?ll=${lat},${lng}&navigate=yes` },
    { label: "Apple Kaarten", href: `https://maps.apple.com/?daddr=${lat},${lng}` },
  ];

  return (
    <div className="grid grid-cols-3 gap-2">
      {links.map((link) => (
        <Button
          key={link.label}
          variant="outline"
          className="h-11 text-xs"
          render={<a href={link.href} target="_blank" rel="noopener noreferrer" />}
        >
          {link.label}
        </Button>
      ))}
    </div>
  );
}
