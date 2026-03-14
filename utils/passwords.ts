import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "crypto";
import { Collection } from "mongodb";
import { promisify } from "util";

const scrypt = promisify(scryptCallback);
const PASSWORD_SCHEME = "scrypt_v1";
const SALT_BYTES = 16;
const KEY_BYTES = 64;

const deriveKey = async (password: string, salt: string) =>
  (await scrypt(password, salt, KEY_BYTES)) as Buffer;

export const isPasswordHash = (value?: string | null) =>
  typeof value === "string" && value.startsWith(`${PASSWORD_SCHEME}$`);

export const needsPasswordMigration = (value?: string | null) =>
  Boolean(value) && !isPasswordHash(value);

export const hashPassword = async (password: string) => {
  const salt = randomBytes(SALT_BYTES).toString("hex");
  const derivedKey = await deriveKey(password, salt);
  return `${PASSWORD_SCHEME}$${salt}$${derivedKey.toString("hex")}`;
};

export const verifyPassword = async ({
  storedPassword,
  candidatePassword,
}: {
  storedPassword?: string | null;
  candidatePassword: string;
}) => {
  if (!storedPassword || !candidatePassword) {
    return false;
  }

  if (!isPasswordHash(storedPassword)) {
    return storedPassword === candidatePassword;
  }

  const [, salt, storedHash] = storedPassword.split("$");
  if (!salt || !storedHash) {
    return false;
  }

  const candidateHash = await deriveKey(candidatePassword, salt);
  const storedHashBuffer = Buffer.from(storedHash, "hex");

  if (storedHashBuffer.length !== candidateHash.length) {
    return false;
  }

  return timingSafeEqual(storedHashBuffer, candidateHash);
};

export const verifyAndUpgradePassword = async ({
  usersCollection,
  user,
  candidatePassword,
}: {
  usersCollection: Collection;
  user: { _id?: unknown; password?: string | null };
  candidatePassword: string;
}) => {
  const storedPassword =
    typeof user?.password === "string" ? user.password : undefined;
  const isValid = await verifyPassword({
    storedPassword,
    candidatePassword,
  });

  if (!isValid) {
    return false;
  }

  if (needsPasswordMigration(storedPassword) && user?._id) {
    const nextPasswordHash = await hashPassword(candidatePassword);
    await usersCollection.updateOne(
      { _id: user._id },
      {
        $set: {
          password: nextPasswordHash,
          updatedAt: new Date(),
        },
      }
    );
    user.password = nextPasswordHash;
  }

  return true;
};
