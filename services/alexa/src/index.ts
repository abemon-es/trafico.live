/**
 * Alexa Skill Lambda handler — trafico.live
 * Handles 3 intents: trenes, tráfico, combustible.
 * Stateless, Lambda-safe, Spanish (es-ES).
 */

import {
  SkillBuilders,
  HandlerInput,
  RequestHandler,
  ErrorHandler,
} from "ask-sdk-core";
import { Response } from "ask-sdk-model";

import {
  handleGetTrainArrival,
  buildGetTrainArrivalResponse,
} from "./intents/get-train-arrival";
import {
  handleGetRoadTraffic,
  buildGetRoadTrafficResponse,
} from "./intents/get-road-traffic";
import {
  handleGetFuelPrice,
  buildGetFuelPriceResponse,
} from "./intents/get-fuel-price";

// ─── Launch Request ───────────────────────────────────────────────────────────

const LaunchRequestHandler: RequestHandler = {
  canHandle(handlerInput: HandlerInput): boolean {
    return (
      handlerInput.requestEnvelope.request.type === "LaunchRequest"
    );
  },
  handle(handlerInput: HandlerInput): Response {
    const speechText =
      "Bienvenido a trafico live. ¿Qué quieres saber? " +
      "Puedo decirte cuándo llega tu tren, cómo está el tráfico o el precio de la gasolina.";
    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(
        "Puedes preguntarme por un tren, una carretera o el precio del combustible.",
      )
      .withShouldEndSession(false)
      .getResponse();
  },
};

// ─── GetTrainArrivalIntent ────────────────────────────────────────────────────

const GetTrainArrivalHandler: RequestHandler = {
  canHandle(handlerInput: HandlerInput): boolean {
    return (
      handlerInput.requestEnvelope.request.type === "IntentRequest" &&
      (handlerInput.requestEnvelope.request as { type: string; intent?: { name?: string } }).intent?.name ===
        "GetTrainArrivalIntent"
    );
  },
  async handle(handlerInput: HandlerInput): Promise<Response> {
    const speechText = await handleGetTrainArrival(handlerInput);
    return buildGetTrainArrivalResponse(
      handlerInput.responseBuilder,
      speechText,
    );
  },
};

// ─── GetRoadTrafficIntent ────────────────────────────────────────────────────

const GetRoadTrafficHandler: RequestHandler = {
  canHandle(handlerInput: HandlerInput): boolean {
    return (
      handlerInput.requestEnvelope.request.type === "IntentRequest" &&
      (handlerInput.requestEnvelope.request as { type: string; intent?: { name?: string } }).intent?.name ===
        "GetRoadTrafficIntent"
    );
  },
  async handle(handlerInput: HandlerInput): Promise<Response> {
    const speechText = await handleGetRoadTraffic(handlerInput);
    return buildGetRoadTrafficResponse(
      handlerInput.responseBuilder,
      speechText,
    );
  },
};

// ─── GetFuelPriceIntent ───────────────────────────────────────────────────────

const GetFuelPriceHandler: RequestHandler = {
  canHandle(handlerInput: HandlerInput): boolean {
    return (
      handlerInput.requestEnvelope.request.type === "IntentRequest" &&
      (handlerInput.requestEnvelope.request as { type: string; intent?: { name?: string } }).intent?.name ===
        "GetFuelPriceIntent"
    );
  },
  async handle(handlerInput: HandlerInput): Promise<Response> {
    const speechText = await handleGetFuelPrice(handlerInput);
    return buildGetFuelPriceResponse(handlerInput.responseBuilder, speechText);
  },
};

// ─── AMAZON.HelpIntent ───────────────────────────────────────────────────────

const HelpIntentHandler: RequestHandler = {
  canHandle(handlerInput: HandlerInput): boolean {
    return (
      handlerInput.requestEnvelope.request.type === "IntentRequest" &&
      (handlerInput.requestEnvelope.request as { type: string; intent?: { name?: string } }).intent?.name ===
        "AMAZON.HelpIntent"
    );
  },
  handle(handlerInput: HandlerInput): Response {
    const speechText =
      "Puedo ayudarte con tres cosas. " +
      "Uno: saber cuándo llega tu tren, por ejemplo, di cuándo llega el AVE a Madrid. " +
      "Dos: el estado del tráfico en una carretera, por ejemplo, cómo está la A dos. " +
      "Tres: el precio de la gasolina, por ejemplo, precio de la gasolina en Barcelona. " +
      "¿Qué quieres saber?";
    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt("¿Sobre qué quieres consultar?")
      .withShouldEndSession(false)
      .getResponse();
  },
};

// ─── AMAZON.CancelAndStopIntent ───────────────────────────────────────────────

const CancelAndStopIntentHandler: RequestHandler = {
  canHandle(handlerInput: HandlerInput): boolean {
    const intentName = (
      handlerInput.requestEnvelope.request as { type: string; intent?: { name?: string } }
    ).intent?.name;
    return (
      handlerInput.requestEnvelope.request.type === "IntentRequest" &&
      (intentName === "AMAZON.CancelIntent" ||
        intentName === "AMAZON.StopIntent")
    );
  },
  handle(handlerInput: HandlerInput): Response {
    return handlerInput.responseBuilder
      .speak("Hasta luego. Consulta trafico.live para más información.")
      .withShouldEndSession(true)
      .getResponse();
  },
};

// ─── SessionEndedRequest ──────────────────────────────────────────────────────

const SessionEndedRequestHandler: RequestHandler = {
  canHandle(handlerInput: HandlerInput): boolean {
    return (
      handlerInput.requestEnvelope.request.type === "SessionEndedRequest"
    );
  },
  handle(handlerInput: HandlerInput): Response {
    // Clean up if needed — nothing to do for stateless skill
    return handlerInput.responseBuilder.getResponse();
  },
};

// ─── Error Handler ────────────────────────────────────────────────────────────

const GlobalErrorHandler: ErrorHandler = {
  canHandle(): boolean {
    return true;
  },
  handle(handlerInput: HandlerInput): Response {
    console.error("Unhandled error in Alexa skill handler");
    return handlerInput.responseBuilder
      .speak(
        "Lo siento, no he podido obtener los datos ahora mismo. Inténtalo en un momento.",
      )
      .reprompt("¿Quieres intentarlo de nuevo?")
      .withShouldEndSession(false)
      .getResponse();
  },
};

// ─── Skill Builder & Lambda export ───────────────────────────────────────────

const skill = SkillBuilders.custom()
  .addRequestHandlers(
    LaunchRequestHandler,
    GetTrainArrivalHandler,
    GetRoadTrafficHandler,
    GetFuelPriceHandler,
    HelpIntentHandler,
    CancelAndStopIntentHandler,
    SessionEndedRequestHandler,
  )
  .addErrorHandlers(GlobalErrorHandler)
  .create();

export const handler = async (event: unknown, context: unknown) => {
  return skill.invoke(event as Parameters<typeof skill.invoke>[0], context as Parameters<typeof skill.invoke>[1]);
};
