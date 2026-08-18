# backend/api/ai/manager.py
import logging
from .providers import (
    GroqProvider,
    GeminiProvider,
)

logger = logging.getLogger(__name__)

class AIManager:
    """
    Manages multiple AI providers with automatic failover.
    """
    
    def __init__(self):
        # Define providers in order of preference
        self.providers = [
            GeminiProvider(),        # Primary
            GroqProvider(),          # Fallback 1
        ]
        # Filter out unavailable providers
        self.providers = [p for p in self.providers if p.is_available()]
        
        if not self.providers:
            raise Exception("No AI providers are available. Please configure at least one API key.")
    
    def generate(self, prompt, system_message=None, max_tokens=1500, temperature=0.7, provider_name=None):
        """
        Generate a response using the specified provider or with automatic failover.
        
        Args:
            provider_name: Optional specific provider name (e.g., "DeepSeek", "OpenAI")
            If not specified, tries providers in order until one succeeds.
        """
        # If a specific provider is requested, try only that one
        if provider_name:
            for provider in self.providers:
                if provider.name == provider_name:
                    try:
                        logger.info(f"Using requested provider: {provider_name}")
                        response = provider.generate(prompt, system_message, max_tokens, temperature)
                        return {
                            "response": response,
                            "provider_used": provider.name,
                        }
                    except Exception as e:
                        logger.error(f"{provider_name} failed: {str(e)}")
                        raise Exception(f"Provider {provider_name} failed: {str(e)}")
            raise Exception(f"Provider '{provider_name}' not found or not available.")
        
        # Automatic failover: try each provider in order
        last_error = None
        for provider in self.providers:
            try:
                logger.info(f"Attempting provider: {provider.name}")
                response = provider.generate(prompt, system_message, max_tokens, temperature)
                logger.info(f"Success with provider: {provider.name}")
                return {
                    "response": response,
                    "provider_used": provider.name,
                }
            except Exception as e:
                logger.warning(f"Provider {provider.name} failed: {str(e)}")
                last_error = str(e)
                continue  # Try the next provider
        
        # If all providers fail
        if last_error and "expired. It will refresh at midnight." in str(last_error):
            raise Exception("The AI request limit has expired. It will refresh at midnight.")
        raise Exception(f"All AI providers failed. Last error: {last_error}")
    
    def get_available_providers(self):
        """Return list of available provider names."""
        return [p.name for p in self.providers]
    
    def switch_provider(self, provider_name):
        """
        Manually switch to a specific provider for the next request.
        This is useful for testing or when a specific provider is preferred.
        """
        for provider in self.providers:
            if provider.name == provider_name:
                # Put this provider at the front of the list
                self.providers.remove(provider)
                self.providers.insert(0, provider)
                logger.info(f"Switched primary provider to: {provider_name}")
                return True
        return False


# Singleton instance
ai_manager = AIManager()