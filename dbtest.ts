import Enmap from "enmap";

interface MyServerData {
	language: string;
	welcomeMessage: string;
	otherSettings?: {
		moderator: string;
		notificationsEnabled: boolean;
	};
}

const database: Enmap<MyServerData> = new Enmap({
	name: "myServerData",
});

database.set("server123", {
	language: "en",
	otherSettings: {
		moderator: "adminUser",
		notificationsEnabled: true,
	},
	welcomeMessage: "Welcome to the server!",
});

database.set("server123", "fr", "language");
const key = database.get("server123", "language");
const otherSettings = database.get("server123", "otherSettings.moderator");
const welcomeMessage = database.get("server123", "welcomeMessage");
const k = database.has("server123", "welcomeMessage");
console.log(`Welcome Message: ${welcomeMessage} | Present: ${k}`);
database.delete("server123", "welcomeMessage");
console.log(database.get("server123", "welcomeMessage"));
console.log(database.has("server123", "welcomeMessage"));
