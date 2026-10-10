import logging
import certifi
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from pymongo import MongoClient
from pymongo.errors import PyMongoError, ServerSelectionTimeoutError, ConnectionFailure
from app.config import settings

logger = logging.getLogger("cleansheet.database")

class DatabaseManager:
    def __init__(self):
        self.client: Optional[MongoClient] = None
        self.db = None
        self.is_connected: bool = False
        self.connection_status: str = "unconfigured"
        self.error_message: Optional[str] = None
        self.last_tested_at: Optional[str] = None
        self.cluster_info: Optional[str] = None
        
        # In-memory fallbacks when MongoDB is offline
        self._in_memory_users: Dict[str, Dict[str, Any]] = {}
        self._in_memory_history: List[Dict[str, Any]] = []
        self._in_memory_recipes: List[Dict[str, Any]] = []

    def connect(self) -> bool:
        """Attempt to connect and ping MongoDB Atlas. Returns True if verified, False otherwise."""
        self.last_tested_at = datetime.now(timezone.utc).isoformat()
        
        uri = settings.MONGODB_URI
        if not uri or not uri.strip() or "username:password" in uri:
            self.is_connected = False
            self.connection_status = "unconfigured"
            self.error_message = "MONGODB_URI is not configured in .env. Running in local in-memory mode."
            logger.info("MongoDB: Not configured. Falling back to local in-memory storage.")
            return False

        try:
            logger.info("MongoDB: Attempting connection to Atlas...")
            # Short timeout to avoid blocking server boot if network or credentials fail
            self.client = MongoClient(
                uri,
                serverSelectionTimeoutMS=3000,
                connectTimeoutMS=3000,
                socketTimeoutMS=3000,
                retryWrites=True,
                appName="CleanSheetAI",
                tlsCAFile=certifi.where()
            )
            # Explicit ping to verify credentials and connectivity
            res = self.client.admin.command('ping')
            if res.get('ok') == 1.0 or res.get('ok') == 1:
                self.db = self.client[settings.MONGODB_DB_NAME]
                self.is_connected = True
                self.connection_status = "connected"
                self.error_message = None
                
                # Fetch server build info safely
                try:
                    build_info = self.client.admin.command('buildInfo')
                    self.cluster_info = f"MongoDB v{build_info.get('version', 'unknown')}"
                except Exception:
                    self.cluster_info = "MongoDB Atlas"

                # Ensure indexes
                self._ensure_indexes()
                logger.info(f"MongoDB: Successfully connected to {settings.MONGODB_DB_NAME} ({self.cluster_info})")
                return True
            else:
                raise ConnectionFailure("Ping response not ok")

        except (ServerSelectionTimeoutError, ConnectionFailure) as e:
            self.is_connected = False
            self.connection_status = "disconnected"
            self.error_message = f"Connection timed out or failed: {str(e)}"
            logger.warning(f"MongoDB connection failed: {e}. Gracefully falling back to in-memory mode.")
            return False
        except PyMongoError as e:
            self.is_connected = False
            self.connection_status = "error"
            self.error_message = f"MongoDB error: {str(e)}"
            logger.warning(f"MongoDB error: {e}. Gracefully falling back to in-memory mode.")
            return False
        except Exception as e:
            self.is_connected = False
            self.connection_status = "error"
            self.error_message = f"Unexpected error: {str(e)}"
            logger.warning(f"MongoDB unexpected error: {e}. Gracefully falling back to in-memory mode.")
            return False

    def _ensure_indexes(self):
        """Create indexes on collections if connected."""
        if not self.is_connected or self.db is None:
            return
        try:
            # Users: unique email/username
            self.db.users.create_index("email", unique=True, sparse=True)
            self.db.users.create_index("username", unique=True, sparse=True)
            # Cleaning history: index on created_at, user_id
            self.db.cleaning_history.create_index([("created_at", -1)])
            self.db.cleaning_history.create_index("session_id")
            # Cleaning recipes: index on name, user_id
            self.db.cleaning_recipes.create_index("name")
        except Exception as e:
            logger.warning(f"Failed to create indexes: {e}")

    def get_status(self) -> Dict[str, Any]:
        """Returns the current verified status of MongoDB connection."""
        return {
            "is_connected": self.is_connected,
            "status": self.connection_status,
            "error": self.error_message,
            "database_name": settings.MONGODB_DB_NAME if self.is_connected else None,
            "cluster_info": self.cluster_info if self.is_connected else None,
            "last_tested_at": self.last_tested_at,
            "mode": "MongoDB Atlas" if self.is_connected else "Local In-Memory Mode (Resilient Fallback)"
        }

    # Collection accessors
    @property
    def users(self):
        return self.db.users if self.is_connected and self.db is not None else None

    @property
    def cleaning_history(self):
        return self.db.cleaning_history if self.is_connected and self.db is not None else None

    @property
    def cleaning_recipes(self):
        return self.db.cleaning_recipes if self.is_connected and self.db is not None else None

    # In-memory fallback methods for history
    def save_history(self, record: Dict[str, Any]) -> str:
        record["created_at"] = record.get("created_at") or datetime.now(timezone.utc).isoformat()
        if self.is_connected and self.cleaning_history is not None:
            res = self.cleaning_history.insert_one(record)
            return str(res.inserted_id)
        else:
            record_id = f"mem_hist_{len(self._in_memory_history) + 1}_{int(datetime.now(timezone.utc).timestamp())}"
            record["_id"] = record_id
            self._in_memory_history.insert(0, record)
            return record_id

    def get_history(self, limit: int = 50, user_id: Optional[str] = None) -> List[Dict[str, Any]]:
        if self.is_connected and self.cleaning_history is not None:
            query = {"user_id": user_id} if user_id else {}
            docs = list(self.cleaning_history.find(query).sort("created_at", -1).limit(limit))
            for doc in docs:
                doc["_id"] = str(doc["_id"])
            return docs
        else:
            if user_id:
                return [h for h in self._in_memory_history if h.get("user_id") == user_id][:limit]
            return self._in_memory_history[:limit]

    # In-memory fallback methods for recipes
    def save_recipe(self, recipe: Dict[str, Any]) -> str:
        recipe["created_at"] = recipe.get("created_at") or datetime.now(timezone.utc).isoformat()
        recipe["updated_at"] = datetime.now(timezone.utc).isoformat()
        if self.is_connected and self.cleaning_recipes is not None:
            res = self.cleaning_recipes.insert_one(recipe)
            return str(res.inserted_id)
        else:
            recipe_id = f"mem_rec_{len(self._in_memory_recipes) + 1}_{int(datetime.now(timezone.utc).timestamp())}"
            recipe["_id"] = recipe_id
            self._in_memory_recipes.insert(0, recipe)
            return recipe_id

    def get_recipes(self, user_id: Optional[str] = None) -> List[Dict[str, Any]]:
        if self.is_connected and self.cleaning_recipes is not None:
            query = {"$or": [{"user_id": user_id}, {"is_public": True}]} if user_id else {}
            docs = list(self.cleaning_recipes.find(query).sort("created_at", -1))
            for doc in docs:
                doc["_id"] = str(doc["_id"])
            return docs
        else:
            return self._in_memory_recipes

    def delete_recipe(self, recipe_id: str) -> bool:
        if self.is_connected and self.cleaning_recipes is not None:
            from bson import ObjectId
            try:
                res = self.cleaning_recipes.delete_one({"_id": ObjectId(recipe_id)})
                return res.deleted_count > 0
            except Exception:
                res = self.cleaning_recipes.delete_one({"_id": recipe_id})
                return res.deleted_count > 0
        else:
            initial_len = len(self._in_memory_recipes)
            self._in_memory_recipes = [r for r in self._in_memory_recipes if r.get("_id") != recipe_id]
            return len(self._in_memory_recipes) < initial_len

db_manager = DatabaseManager()
