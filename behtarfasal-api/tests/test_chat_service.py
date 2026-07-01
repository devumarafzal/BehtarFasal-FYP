import unittest
from unittest.mock import patch

from app.models.chat_model import ChatRequest
from app.services.chat_service import process_chat_message


class ChatServiceTests(unittest.IsolatedAsyncioTestCase):
    async def test_process_chat_message_returns_fallback_when_provider_fails(self):
        request = ChatRequest(message="Mere wheat mein patte peele ho rahe hain", userId="user-1")

        with patch("app.services.chat_service.generate_gemini_response", side_effect=RuntimeError("provider down")):
            response = await process_chat_message(request)

        self.assertEqual(response.intent, "DISEASE")
        self.assertTrue(response.reply)
        self.assertIn("disease", response.reply.lower())


if __name__ == "__main__":
    unittest.main()
