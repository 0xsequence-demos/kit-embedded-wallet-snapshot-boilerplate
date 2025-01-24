interface IEnv {
  PKEY: string; // Private key for EOA wallet
}

function fastResponse(message: string, status = 400) {
  return new Response(message, { status });
}

export const onRequest: PagesFunction<IEnv> = async (ctx) => {
  if (ctx.env.PKEY === undefined || ctx.env.PKEY === "") {
    return fastResponse(
      "Make sure PKEY is configured in your environment",
      500,
    );
  }

  try {
    if (ctx.request.method === "GET") {
      return fastResponse(JSON.stringify({ hello: "world" }), 200);
    } else {
      return fastResponse(`Method not supported: ${ctx.request.method}`, 405);
    }
  } catch (err) {
    console.error(`error: ${err}`);
    return fastResponse(err, 500);
  }
};
