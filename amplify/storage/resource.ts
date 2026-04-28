import { defineStorage } from "@aws-amplify/backend";

export const storage = defineStorage({
  name: "fireTestPhotos",
  access: (allow) => ({
    "photos/*": [
      allow.guest.to(["read", "write", "delete"]),
    ],
  }),
});
